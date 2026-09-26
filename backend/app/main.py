from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, collections, config, documents, note, workspace_members, workspaces

app = FastAPI(title="KnowFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(collections.router)
app.include_router(documents.router)
app.include_router(note.router)
app.include_router(config.router)
app.include_router(workspace_members.router)

@app.get("/")
def root():
    return {"message": "KnowFlow API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}