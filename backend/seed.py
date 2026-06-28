"""
Script de seed para datos demo.
Uso: python seed.py
Requiere DATABASE_URL en el entorno (o .env).
"""
import asyncio
from datetime import datetime, timedelta, date
from decimal import Decimal

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import hash_password

# Modelos base
from app.models.organizacion import Organizacion, RubroNegocio, PlanOrg, EstadoOrg
from app.models.usuario import Usuario, RolUsuario
from app.models.suscripcion import Suscripcion, EstadoSuscripcion

# Veterinaria
from app.models.veterinaria.propietario import Propietario
from app.models.veterinaria.paciente import Paciente, Sexo
from app.models.veterinaria.cita import CitaVet, EstadoCita
from app.models.veterinaria.historial import HistorialMedico
from app.models.veterinaria.vacuna import Vacuna

# Belleza
from app.models.belleza.cliente import ClienteBelleza
from app.models.belleza.servicio import Servicio
from app.models.belleza.cita import CitaBelleza, EstadoCitaBelleza

# Ropería
from app.models.roperia.categoria import Categoria
from app.models.roperia.producto import Producto
from app.models.roperia.venta import Venta, ItemVenta, MetodoPago, EstadoVenta


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # ─── Superadmin ──────────────────────────────────────────
        superadmin = Usuario(
            nombre="Super",
            apellido="Admin",
            email="admin@rubro.app",
            password_hash=hash_password("Admin1234!"),
            rol=RolUsuario.superadmin,
            activo=True,
            organizacion_id=None,
        )
        db.add(superadmin)
        await db.flush()

        # ─── Org Veterinaria ─────────────────────────────────────
        vet_org = Organizacion(
            nombre="Clínica Veterinaria Huellitas",
            ruc="80012345-1",
            rubro=RubroNegocio.veterinaria,
            plan=PlanOrg.pro,
            estado=EstadoOrg.activa,
        )
        db.add(vet_org)
        await db.flush()

        vet_admin = Usuario(
            nombre="María",
            apellido="González",
            email="maria@huellitas.com",
            password_hash=hash_password("Demo1234!"),
            rol=RolUsuario.org_admin,
            activo=True,
            organizacion_id=vet_org.id,
        )
        vet_staff = Usuario(
            nombre="Carlos",
            apellido="López",
            email="carlos@huellitas.com",
            password_hash=hash_password("Demo1234!"),
            rol=RolUsuario.staff,
            activo=True,
            organizacion_id=vet_org.id,
        )
        db.add_all([vet_admin, vet_staff])
        await db.flush()

        db.add(Suscripcion(
            organizacion_id=vet_org.id,
            plan="pro",
            estado=EstadoSuscripcion.activa,
            monto_mensual=Decimal("99000"),
            fecha_inicio=datetime.utcnow() - timedelta(days=30),
            fecha_vencimiento=datetime.utcnow() + timedelta(days=335),
        ))

        prop1 = Propietario(
            organizacion_id=vet_org.id,
            nombre="Juan",
            apellido="Ramírez",
            ci="4123456",
            telefono="0981-123456",
            email="juan.ramirez@gmail.com",
        )
        prop2 = Propietario(
            organizacion_id=vet_org.id,
            nombre="Ana",
            apellido="Martínez",
            ci="5234567",
            telefono="0991-234567",
        )
        db.add_all([prop1, prop2])
        await db.flush()

        pac1 = Paciente(
            organizacion_id=vet_org.id,
            propietario_id=prop1.id,
            nombre="Max",
            especie="Canino",
            raza="Labrador",
            color="Amarillo",
            sexo=Sexo.macho,
            fecha_nacimiento=date(2020, 3, 15),
            esterilizado=True,
        )
        pac2 = Paciente(
            organizacion_id=vet_org.id,
            propietario_id=prop1.id,
            nombre="Luna",
            especie="Felino",
            raza="Siamés",
            color="Blanco y gris",
            sexo=Sexo.hembra,
            fecha_nacimiento=date(2022, 7, 8),
        )
        pac3 = Paciente(
            organizacion_id=vet_org.id,
            propietario_id=prop2.id,
            nombre="Rocky",
            especie="Canino",
            raza="Bulldog",
            color="Beige",
            sexo=Sexo.macho,
        )
        db.add_all([pac1, pac2, pac3])
        await db.flush()

        db.add_all([
            CitaVet(
                organizacion_id=vet_org.id,
                paciente_id=pac1.id,
                veterinario_id=vet_staff.id,
                fecha_hora=datetime.utcnow() + timedelta(hours=2),
                motivo="Revisión anual",
                estado=EstadoCita.confirmada,
            ),
            CitaVet(
                organizacion_id=vet_org.id,
                paciente_id=pac2.id,
                veterinario_id=vet_staff.id,
                fecha_hora=datetime.utcnow() + timedelta(days=1, hours=10),
                motivo="Vacunación",
                estado=EstadoCita.pendiente,
            ),
            CitaVet(
                organizacion_id=vet_org.id,
                paciente_id=pac3.id,
                fecha_hora=datetime.utcnow() - timedelta(days=3),
                motivo="Consulta dermatológica",
                estado=EstadoCita.completada,
            ),
        ])

        db.add(HistorialMedico(
            organizacion_id=vet_org.id,
            paciente_id=pac1.id,
            veterinario_id=vet_staff.id,
            fecha=datetime.utcnow() - timedelta(days=30),
            motivo_consulta="Control de rutina",
            diagnostico="Buen estado de salud general",
            tratamiento="Antipulgas mensual",
            peso_kg=Decimal("28.5"),
            temperatura=Decimal("38.4"),
        ))

        db.add_all([
            Vacuna(
                organizacion_id=vet_org.id,
                paciente_id=pac1.id,
                nombre_vacuna="Vacuna Antirrábica",
                lote="LOT-2024-001",
                fecha_aplicacion=date.today() - timedelta(days=180),
                fecha_vencimiento=date.today() + timedelta(days=185),
                veterinario_id=vet_staff.id,
            ),
            Vacuna(
                organizacion_id=vet_org.id,
                paciente_id=pac2.id,
                nombre_vacuna="Triple Felina",
                lote="LOT-2024-002",
                fecha_aplicacion=date.today() - timedelta(days=365),
                fecha_vencimiento=date.today() - timedelta(days=5),  # vencida — para probar el banner
                veterinario_id=vet_staff.id,
            ),
        ])

        # ─── Org Belleza ─────────────────────────────────────────
        bel_org = Organizacion(
            nombre="Salón de Belleza Glamour",
            ruc="80098765-2",
            rubro=RubroNegocio.belleza,
            plan=PlanOrg.basico,
            estado=EstadoOrg.activa,
        )
        db.add(bel_org)
        await db.flush()

        bel_admin = Usuario(
            nombre="Sofía",
            apellido="Cabrera",
            email="sofia@glamour.com",
            password_hash=hash_password("Demo1234!"),
            rol=RolUsuario.org_admin,
            activo=True,
            organizacion_id=bel_org.id,
        )
        bel_staff1 = Usuario(
            nombre="Valentina",
            apellido="Torres",
            email="valentina@glamour.com",
            password_hash=hash_password("Demo1234!"),
            rol=RolUsuario.staff,
            activo=True,
            organizacion_id=bel_org.id,
        )
        db.add_all([bel_admin, bel_staff1])
        await db.flush()

        db.add(Suscripcion(
            organizacion_id=bel_org.id,
            plan="basico",
            estado=EstadoSuscripcion.activa,
            monto_mensual=Decimal("49000"),
            fecha_inicio=datetime.utcnow() - timedelta(days=15),
            fecha_vencimiento=datetime.utcnow() + timedelta(days=350),
        ))

        srv1 = Servicio(organizacion_id=bel_org.id, nombre="Corte de cabello", duracion_minutos=30, precio=Decimal("50000"))
        srv2 = Servicio(organizacion_id=bel_org.id, nombre="Manicure", duracion_minutos=45, precio=Decimal("35000"))
        srv3 = Servicio(organizacion_id=bel_org.id, nombre="Tinte completo", duracion_minutos=90, precio=Decimal("120000"))
        db.add_all([srv1, srv2, srv3])
        await db.flush()

        cli1 = ClienteBelleza(organizacion_id=bel_org.id, nombre="Lucía", apellido="Mendoza", telefono="0981-555111", email="lucia@email.com")
        cli2 = ClienteBelleza(organizacion_id=bel_org.id, nombre="Paula", apellido="Ruiz", telefono="0991-666222")
        db.add_all([cli1, cli2])
        await db.flush()

        db.add_all([
            CitaBelleza(
                organizacion_id=bel_org.id,
                cliente_id=cli1.id,
                staff_id=bel_staff1.id,
                servicio_id=srv1.id,
                fecha_hora=datetime.utcnow() + timedelta(hours=3),
                estado=EstadoCitaBelleza.confirmada,
                precio_cobrado=srv1.precio,
            ),
            CitaBelleza(
                organizacion_id=bel_org.id,
                cliente_id=cli2.id,
                servicio_id=srv2.id,
                fecha_hora=datetime.utcnow() + timedelta(days=1, hours=14),
                estado=EstadoCitaBelleza.pendiente,
            ),
        ])

        # ─── Org Ropería ─────────────────────────────────────────
        rop_org = Organizacion(
            nombre="Tienda de Ropa Moda Total",
            ruc="80055555-3",
            rubro=RubroNegocio.roperia,
            plan=PlanOrg.free,
            estado=EstadoOrg.prueba,
        )
        db.add(rop_org)
        await db.flush()

        rop_admin = Usuario(
            nombre="Diego",
            apellido="Flores",
            email="diego@modatotal.com",
            password_hash=hash_password("Demo1234!"),
            rol=RolUsuario.org_admin,
            activo=True,
            organizacion_id=rop_org.id,
        )
        db.add(rop_admin)
        await db.flush()

        db.add(Suscripcion(
            organizacion_id=rop_org.id,
            plan="free",
            estado=EstadoSuscripcion.prueba,
            fecha_inicio=datetime.utcnow() - timedelta(days=5),
            fecha_vencimiento=datetime.utcnow() + timedelta(days=25),
        ))

        cat1 = Categoria(organizacion_id=rop_org.id, nombre="Camisas", descripcion="Todo tipo de camisas")
        cat2 = Categoria(organizacion_id=rop_org.id, nombre="Pantalones", descripcion="Jeans y pantalones")
        cat3 = Categoria(organizacion_id=rop_org.id, nombre="Accesorios")
        db.add_all([cat1, cat2, cat3])
        await db.flush()

        prod1 = Producto(
            organizacion_id=rop_org.id,
            categoria_id=cat1.id,
            codigo="CAM-001",
            nombre="Camisa Oxford Azul",
            precio_venta=Decimal("85000"),
            precio_costo=Decimal("40000"),
            stock=15,
            stock_minimo=5,
        )
        prod2 = Producto(
            organizacion_id=rop_org.id,
            categoria_id=cat2.id,
            codigo="PAN-001",
            nombre="Jean Clásico Negro",
            precio_venta=Decimal("120000"),
            precio_costo=Decimal("60000"),
            stock=3,
            stock_minimo=5,  # stock bajo — para probar alertas
        )
        prod3 = Producto(
            organizacion_id=rop_org.id,
            categoria_id=cat3.id,
            codigo="ACC-001",
            nombre="Cinturón de Cuero",
            precio_venta=Decimal("45000"),
            precio_costo=Decimal("20000"),
            stock=20,
            stock_minimo=3,
        )
        db.add_all([prod1, prod2, prod3])
        await db.flush()

        venta = Venta(
            organizacion_id=rop_org.id,
            cajero_id=rop_admin.id,
            total=Decimal("205000"),
            metodo_pago=MetodoPago.efectivo,
            estado=EstadoVenta.completada,
            cliente_nombre="Cliente genérico",
        )
        db.add(venta)
        await db.flush()

        db.add_all([
            ItemVenta(venta_id=venta.id, producto_id=prod1.id, cantidad=1, precio_unitario=Decimal("85000"), subtotal=Decimal("85000")),
            ItemVenta(venta_id=venta.id, producto_id=prod3.id, cantidad=1, precio_unitario=Decimal("45000"), subtotal=Decimal("45000")),
        ])

        await db.commit()

    await engine.dispose()

    print("✓ Seed completado exitosamente")
    print("")
    print("Credenciales demo:")
    print("  superadmin:  admin@rubro.app         / Admin1234!")
    print("  veterinaria: maria@huellitas.com     / Demo1234!")
    print("  belleza:     sofia@glamour.com        / Demo1234!")
    print("  ropería:     diego@modatotal.com      / Demo1234!")


if __name__ == "__main__":
    asyncio.run(seed())
