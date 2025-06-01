import enum

class UserRole(str, enum.Enum): # Herdando de str para fácil serialização/uso em FastAPI
    CLIENTE = "CLIENTE"
    PROFISSIONAL = "PROFISSIONAL"
    ATENDENTE = "ATENDENTE"
    GESTOR = "GESTOR"
    # ADMIN_MASTER é um role do AdminMasterUser, não do UserTenant
