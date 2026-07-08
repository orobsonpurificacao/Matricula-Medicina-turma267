from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.escalonamento import rodar_escalonamento
from app.schemas import ResultadoEscalonamento

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/escalonar", response_model=ResultadoEscalonamento)
def escalonar(db: Session = Depends(get_db)):
    """Roda o escalonamento por CR. Pode ser chamado múltiplas vezes."""
    return rodar_escalonamento(db)
