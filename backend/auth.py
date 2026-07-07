from fastapi import Security, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.config import API_KEY

# Using HTTPBearer for Bearer token auth
security_scheme = HTTPBearer(auto_error=False)

async def verify_api_key(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security_scheme)
):
    # If API_KEY config is empty, skip validation
    if not API_KEY:
        return
    
    # 1. Try checking standard Bearer header
    if credentials is not None and credentials.credentials == API_KEY:
        return
        
    # 2. Try checking query parameter 'token' (crucial for EventSource/SSE)
    token_param = request.query_params.get("token")
    if token_param == API_KEY:
        return
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key"
    )
