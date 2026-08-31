import random, string
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
import os, shutil, uuid

from app.db.database import get_db
from app.models.models import Transaction, SellerBalance, TxType, TxStatus, User, UserRole, Notification, NotificationType
from app.core.deps import current_user, seller_only, admin_only
from app.core.security import verify_password
from app.core.response import ok, err
from app.core.config import settings

router = APIRouter(prefix="/wallet", tags=["Wallet"])

os.makedirs(f"{settings.UPLOAD_DIR}/proofs", exist_ok=True)


def gen_tx_id():
    return "TX-" + "".join(random.choices(string.digits, k=6))


async def gen_unique_tx_id(db: AsyncSession) -> str:
    for _ in range(5):
        tx_id = gen_tx_id()
        exists = await db.execute(select(Transaction.id).where(Transaction.id == tx_id))
        if not exists.scalar_one_or_none():
            return tx_id
    raise HTTPException(500, "Could not generate a unique transaction ID, please retry")


def tx_dict(t: Transaction) -> dict:
    return {
        "id": t.id,
        "type": t.type.value,
        "amount": float(t.amount),
        "status": t.status.value,
        "date": t.created_at.strftime("%Y-%m-%d"),
        "method": t.method,
        "sellerEmail": t.seller.email if t.seller else None,
        "txHash": t.tx_hash,
        "walletAddress": t.wallet_address,
        "proofImage": f"/wallet/proof/{os.path.basename(t.proof_image)}" if t.proof_image else None,
    }


def bal_dict(b: SellerBalance) -> dict:
    return {
        "balance": float(b.balance),
        "withdrawable": float(b.withdrawable),
        "pendingDeposit": float(b.pending_deposit),
        "totalWithdrawn": float(b.total_withdrawn),
    }


async def get_or_create_balance(seller_id: int, db: AsyncSession, lock: bool = False) -> SellerBalance:
    q = select(SellerBalance).where(SellerBalance.seller_id == seller_id)
    if lock:
        q = q.with_for_update()
    result = await db.execute(q)
    bal = result.scalar_one_or_none()
    if not bal:
        bal = SellerBalance(seller_id=seller_id)
        db.add(bal)
        await db.flush()
    return bal


@router.get("/balance")
async def get_balance(user: User = Depends(seller_only), db: AsyncSession = Depends(get_db)):
    bal = await get_or_create_balance(user.id, db)
    return ok(bal_dict(bal))


@router.get("/proof/{filename}")
async def get_proof_image(filename: str, user: User = Depends(current_user),
                          db: AsyncSession = Depends(get_db)):
    # filename must be a bare filename (no path segments) to prevent path traversal
    if filename != os.path.basename(filename):
        raise HTTPException(400, "Invalid filename")

    path = f"{settings.UPLOAD_DIR}/proofs/{filename}"
    result = await db.execute(select(Transaction).where(Transaction.proof_image == path))
    tx = result.scalar_one_or_none()
    if not tx or not os.path.isfile(path):
        raise HTTPException(404, "Not found")
    if user.role != UserRole.admin and tx.seller_id != user.id:
        raise HTTPException(403, "Not authorized")
    return FileResponse(path)


@router.post("/deposit")
async def submit_deposit(
    amount: float = Form(..., gt=0),
    txHash: Optional[str] = Form(None),
    method: str = Form("USDT (TRC20)"),
    proof: Optional[UploadFile] = File(None),
    user: User = Depends(seller_only),
    db: AsyncSession = Depends(get_db),
):
    proof_path = None
    if proof:
        fname = f"{uuid.uuid4()}.{proof.filename.split('.')[-1]}"
        proof_path = f"{settings.UPLOAD_DIR}/proofs/{fname}"
        with open(proof_path, "wb") as f:
            shutil.copyfileobj(proof.file, f)

    tx = Transaction(
        id=await gen_unique_tx_id(db), seller_id=user.id,
        type=TxType.Deposit, amount=Decimal(str(amount)),
        method=method, tx_hash=txHash, proof_image=proof_path,
    )
    db.add(tx)

    bal = await get_or_create_balance(user.id, db, lock=True)
    bal.pending_deposit += Decimal(str(amount))
    db.add(bal)
    await db.commit()
    await db.refresh(tx)
    return ok({"transaction": tx_dict(tx)}, 201)


class WithdrawIn(BaseModel):
    amount: float = Field(gt=0)
    walletAddress: str
    transactionPassword: Optional[str] = None
    method: str = "USDT TRC20 / BTC"


@router.post("/withdraw")
async def request_withdrawal(data: WithdrawIn, user: User = Depends(seller_only),
                             db: AsyncSession = Depends(get_db)):
    # Verify transaction password if set
    if user.hashed_txn_password:
        if not data.transactionPassword:
            return err("Transaction password required", 403)
        if not verify_password(data.transactionPassword, user.hashed_txn_password):
            return err("Invalid transaction password", 403)

    bal = await get_or_create_balance(user.id, db, lock=True)
    if Decimal(str(data.amount)) > bal.withdrawable:
        return err("Insufficient withdrawable balance", 400)

    # Check no pending withdrawal
    pending = await db.execute(
        select(Transaction).where(
            Transaction.seller_id == user.id,
            Transaction.type == TxType.Withdrawal,
            Transaction.status == TxStatus.Pending,
        )
    )
    if pending.scalar_one_or_none():
        return err("You already have a pending withdrawal request", 400)

    tx = Transaction(
        id=await gen_unique_tx_id(db), seller_id=user.id,
        type=TxType.Withdrawal, amount=Decimal(str(data.amount)),
        method=data.method, wallet_address=data.walletAddress,
    )
    db.add(tx)

    # Reserve amount
    bal.withdrawable -= Decimal(str(data.amount))
    db.add(bal)
    await db.commit()
    await db.refresh(tx)
    return ok({"transaction": tx_dict(tx)}, 201)


@router.get("/transactions")
async def my_transactions(
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(seller_only),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    q = select(Transaction).options(selectinload(Transaction.seller))\
        .where(Transaction.seller_id == user.id)
    if type:
        q = q.where(Transaction.type == type)
    if status:
        q = q.where(Transaction.status == status)
    q = q.order_by(Transaction.created_at.desc()).offset((page - 1) * limit).limit(limit)
    txns = (await db.execute(q)).scalars().all()
    return ok({"transactions": [tx_dict(t) for t in txns]})
