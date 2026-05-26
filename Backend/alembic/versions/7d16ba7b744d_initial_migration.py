"""initial migration

Revision ID: 7d16ba7b744d
Revises: 
Create Date: 2026-05-25 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7d16ba7b744d'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create 'users' table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 2. Create 'corn_classes' table
    op.create_table(
        'corn_classes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('symptoms', sa.Text(), nullable=True),
        sa.Column('favored_conditions', sa.Text(), nullable=True),
        sa.Column('preventive_management', sa.Text(), nullable=True),
        sa.Column('treatment', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_corn_classes_id'), 'corn_classes', ['id'], unique=False)
    op.create_index(op.f('ix_corn_classes_name'), 'corn_classes', ['name'], unique=True)

def downgrade() -> None:
    # Drop 'corn_classes' table
    op.drop_index(op.f('ix_corn_classes_name'), table_name='corn_classes')
    op.drop_index(op.f('ix_corn_classes_id'), table_name='corn_classes')
    op.drop_table('corn_classes')
    
    # Drop 'users' table
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
