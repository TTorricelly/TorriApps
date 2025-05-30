from fastapi import APIRouter, Depends
from . import services, Schemas

router = APIRouter(prefix='/auth', tags=['auth'])

@router.post('/register', response_model=Schemas.User)
def register(user: Schemas.UserCreate):
    return services.create_user(user)

