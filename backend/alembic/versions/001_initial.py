"""Initial migration — todas las tablas del sistema Rubro

Revision ID: 001_initial
Revises:
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # organizaciones
    op.create_table('organizaciones',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('ruc', sa.String(20), unique=True, nullable=True),
        sa.Column('rubro', sa.Enum('veterinaria', 'belleza', 'roperia', name='rubronegocio'), nullable=False),
        sa.Column('plan', sa.Enum('free', 'basico', 'pro', name='planorg'), server_default='free'),
        sa.Column('estado', sa.Enum('activa', 'suspendida', 'prueba', name='estadoorg'), server_default='prueba'),
        sa.Column('activo', sa.Boolean(), server_default='true'),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('configuracion', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # usuarios
    op.create_table('usuarios',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('apellido', sa.String(100), nullable=False),
        sa.Column('email', sa.String(200), unique=True, nullable=False, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('rol', sa.Enum('superadmin', 'org_admin', 'staff', 'cliente', name='rolusuario'), nullable=False),
        sa.Column('activo', sa.Boolean(), server_default='true'),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), nullable=True, index=True),
        sa.Column('reset_token_hash', sa.String(64), nullable=True),
        sa.Column('reset_token_exp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('preferencias', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # suscripciones
    op.create_table('suscripciones',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('plan', sa.String(50), nullable=False),
        sa.Column('estado', sa.Enum('activa', 'vencida', 'cancelada', 'prueba', name='estadosuscripcion'), server_default='prueba'),
        sa.Column('monto_mensual', sa.Numeric(10, 2), nullable=True),
        sa.Column('fecha_inicio', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('fecha_vencimiento', sa.DateTime(timezone=True), nullable=True),
        sa.Column('referencia_pago', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- VETERINARIA ---
    op.create_table('vet_propietarios',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('apellido', sa.String(100), nullable=False),
        sa.Column('ci', sa.String(20), nullable=True),
        sa.Column('telefono', sa.String(30), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('direccion', sa.String(300), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('vet_pacientes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('propietario_id', sa.Integer(), sa.ForeignKey('vet_propietarios.id'), index=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('especie', sa.String(50), nullable=False),
        sa.Column('raza', sa.String(100), nullable=True),
        sa.Column('color', sa.String(50), nullable=True),
        sa.Column('sexo', sa.Enum('macho', 'hembra', 'desconocido', name='sexo'), server_default='desconocido'),
        sa.Column('fecha_nacimiento', sa.Date(), nullable=True),
        sa.Column('esterilizado', sa.Boolean(), server_default='false'),
        sa.Column('foto_url', sa.String(500), nullable=True),
        sa.Column('activo', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('vet_citas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('paciente_id', sa.Integer(), sa.ForeignKey('vet_pacientes.id'), index=True),
        sa.Column('veterinario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=True),
        sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=False),
        sa.Column('motivo', sa.String(300), nullable=False),
        sa.Column('estado', sa.Enum('pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada', name='estadocita'), server_default='pendiente'),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('vet_historiales',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('paciente_id', sa.Integer(), sa.ForeignKey('vet_pacientes.id'), index=True),
        sa.Column('veterinario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=True),
        sa.Column('fecha', sa.DateTime(timezone=True), nullable=False),
        sa.Column('motivo_consulta', sa.String(300), nullable=False),
        sa.Column('diagnostico', sa.Text(), nullable=True),
        sa.Column('tratamiento', sa.Text(), nullable=True),
        sa.Column('medicamentos', sa.Text(), nullable=True),
        sa.Column('peso_kg', sa.Numeric(6, 2), nullable=True),
        sa.Column('temperatura', sa.Numeric(4, 1), nullable=True),
        sa.Column('proxima_cita', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('vet_vacunas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('paciente_id', sa.Integer(), sa.ForeignKey('vet_pacientes.id'), index=True),
        sa.Column('nombre_vacuna', sa.String(200), nullable=False),
        sa.Column('lote', sa.String(100), nullable=True),
        sa.Column('fecha_aplicacion', sa.Date(), nullable=False),
        sa.Column('fecha_vencimiento', sa.Date(), nullable=True),
        sa.Column('veterinario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=True),
        sa.Column('recordatorio_enviado', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- BELLEZA ---
    op.create_table('bel_clientes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('apellido', sa.String(100), nullable=False),
        sa.Column('telefono', sa.String(30), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('activo', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('bel_servicios',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('nombre', sa.String(150), nullable=False),
        sa.Column('descripcion', sa.String(500), nullable=True),
        sa.Column('duracion_minutos', sa.Integer(), server_default='30'),
        sa.Column('precio', sa.Numeric(10, 2), nullable=False),
        sa.Column('activo', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('bel_citas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('cliente_id', sa.Integer(), sa.ForeignKey('bel_clientes.id'), index=True),
        sa.Column('staff_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=True),
        sa.Column('servicio_id', sa.Integer(), sa.ForeignKey('bel_servicios.id')),
        sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=False),
        sa.Column('estado', sa.Enum('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio', name='estadocitabelleza'), server_default='pendiente'),
        sa.Column('precio_cobrado', sa.Numeric(10, 2), nullable=True),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- ROPERÍA ---
    op.create_table('rop_categorias',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.String(300), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('rop_productos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('categoria_id', sa.Integer(), sa.ForeignKey('rop_categorias.id'), nullable=True),
        sa.Column('codigo', sa.String(50), nullable=True, index=True),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('descripcion', sa.String(500), nullable=True),
        sa.Column('precio_venta', sa.Numeric(10, 2), nullable=False),
        sa.Column('precio_costo', sa.Numeric(10, 2), nullable=True),
        sa.Column('stock', sa.Integer(), server_default='0'),
        sa.Column('stock_minimo', sa.Integer(), server_default='0'),
        sa.Column('variantes', sa.JSON(), server_default='{}'),
        sa.Column('foto_url', sa.String(500), nullable=True),
        sa.Column('activo', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('rop_ventas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizacion_id', sa.Integer(), sa.ForeignKey('organizaciones.id'), index=True),
        sa.Column('cajero_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=True),
        sa.Column('numero_factura', sa.String(50), nullable=True),
        sa.Column('total', sa.Numeric(12, 2), nullable=False),
        sa.Column('descuento', sa.Numeric(10, 2), server_default='0'),
        sa.Column('metodo_pago', sa.Enum('efectivo', 'tarjeta', 'transferencia', 'credito', name='metodopago'), server_default='efectivo'),
        sa.Column('estado', sa.Enum('completada', 'anulada', 'pendiente', name='estadoventa'), server_default='completada'),
        sa.Column('cliente_nombre', sa.String(200), nullable=True),
        sa.Column('notas', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('rop_items_venta',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('venta_id', sa.Integer(), sa.ForeignKey('rop_ventas.id'), index=True),
        sa.Column('producto_id', sa.Integer(), sa.ForeignKey('rop_productos.id')),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('precio_unitario', sa.Numeric(10, 2), nullable=False),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False),
        sa.Column('variante', sa.JSON(), server_default='{}'),
    )


def downgrade() -> None:
    op.drop_table('rop_items_venta')
    op.drop_table('rop_ventas')
    op.drop_table('rop_productos')
    op.drop_table('rop_categorias')
    op.drop_table('bel_citas')
    op.drop_table('bel_servicios')
    op.drop_table('bel_clientes')
    op.drop_table('vet_vacunas')
    op.drop_table('vet_historiales')
    op.drop_table('vet_citas')
    op.drop_table('vet_pacientes')
    op.drop_table('vet_propietarios')
    op.drop_table('suscripciones')
    op.drop_table('usuarios')
    op.drop_table('organizaciones')
    op.execute('DROP TYPE IF EXISTS rubronegocio')
    op.execute('DROP TYPE IF EXISTS planorg')
    op.execute('DROP TYPE IF EXISTS estadoorg')
    op.execute('DROP TYPE IF EXISTS rolusuario')
    op.execute('DROP TYPE IF EXISTS estadosuscripcion')
    op.execute('DROP TYPE IF EXISTS sexo')
    op.execute('DROP TYPE IF EXISTS estadocita')
    op.execute('DROP TYPE IF EXISTS estadocitabelleza')
    op.execute('DROP TYPE IF EXISTS metodopago')
    op.execute('DROP TYPE IF EXISTS estadoventa')
