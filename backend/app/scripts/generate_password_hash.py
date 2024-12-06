from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

if __name__ == "__main__":
    password = "password"
    hashed_password = get_password_hash(password)
    print(f"Password: {password}")
    print(f"Hashed password: {hashed_password}") 