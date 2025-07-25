"""
공통 데이터베이스 인스턴스
모든 모델에서 이 파일의 db 인스턴스를 사용
"""

from flask_sqlalchemy import SQLAlchemy

# 공통 SQLAlchemy 인스턴스
db = SQLAlchemy()

