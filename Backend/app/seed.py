from sqlalchemy.orm import Session
from .models import User, CornClass
from .auth import hash_password
from .config import ADMIN_USERNAME, ADMIN_PASSWORD

def seed_initial_data(db: Session):
    """Seed default admin credentials and detailed corn plant class data."""
    # 1. Seed Admin User
    admin_user = db.query(User).filter(User.username == ADMIN_USERNAME).first()
    if not admin_user:
        hashed = hash_password(ADMIN_PASSWORD)
        new_admin = User(username=ADMIN_USERNAME, password_hash=hashed)
        db.add(new_admin)
        db.commit()
        print(f"[*] Admin user '{ADMIN_USERNAME}' successfully seeded.")
    else:
        print("[*] Admin user already exists. Skipping.")

    # 2. Seed Class Information
    classes_to_seed = [
        {
            "name": "Blight",
            "display_name": "Blight (Tizón Foliar del Maíz)",
            "description": (
                "Principalmente conocido como Northern Corn Leaf Blight (NCLB), causado por el hongo "
                "Exserohilum turcicum. Es una de las enfermedades más destructivas si infecta la planta "
                "antes de la floración."
            ),
            "symptoms": (
                "Produce lesiones largas, elípticas o en forma de 'canoa' o 'cigarro' (de 2 a 15 cm de largo). "
                "Comienzan con un color verde grisáceo y luego se vuelven de color canela o marrón claro. "
                "La infección casi siempre empieza en las hojas inferiores (las más viejas) y va subiendo."
            ),
            "favored_conditions": (
                "Se dispara con temperaturas moderadas (entre 18°C y 27°C) combinadas con alta humedad, "
                "rocío prolongado o lluvias frecuentes."
            ),
            "preventive_management": (
                "• Rotación de cultivos: El hongo sobrevive el invierno en los rastrojos (restos de hojas muertas). "
                "Rotar con soja u otros cultivos rompe su ciclo.\n"
                "• Manejo de rastrojo: En zonas con historial grave de Tizón, el arado o labranza para enterrar "
                "y descomponer los restos de la cosecha anterior es vital."
            ),
            "treatment": (
                "• La aplicación de fungicidas (como Propiconazol, o mezclas de Triazol + Estrobirulina) es "
                "altamente efectiva si se aplica de forma preventiva-curativa en etapas de desarrollo V6-V10, "
                "o cerca de la etapa de floración (espigamiento/VT-R1).\n"
                "• Productos a base de Mancozeb también se usan en etapas tempranas como protectantes."
            )
        },
        {
            "name": "Common_Rust",
            "display_name": "Common_Rust (Roya Común)",
            "description": (
                "Causada por el hongo Puccinia sorghi. Es una enfermedad muy extendida, impulsada por el viento, "
                "pero que suele ser menos letal que el Tizón si se maneja a tiempo."
            ),
            "symptoms": (
                "Aparición de pequeñas pústulas (protuberancias) circulares o alargadas de color ladrillo, "
                "óxido o marrón oscuro. El rasgo clave es que estas pústulas rompen la epidermis de la hoja "
                "y aparecen en ambos lados (haz y envés) de la misma, liberando un polvillo (esporas)."
            ),
            "favored_conditions": (
                "A diferencia de otros hongos, la Roya Común prefiere el clima más fresco (16°C a 25°C) con alta "
                "humedad (más de 6 horas de rocío en las hojas). Si el clima se vuelve muy caluroso y seco, "
                "el hongo detiene su desarrollo natural."
            ),
            "preventive_management": (
                "• La siembra de híbridos de maíz genéticamente resistentes es, de lejos, la estrategia más "
                "económica y efectiva.\n"
                "• A diferencia del Tizón, la Roya Común no suele sobrevivir el invierno en el rastrojo local, "
                "sino que las esporas llegan sopladas por el viento desde climas más cálidos al inicio de la temporada."
            ),
            "treatment": (
                "• Se recomienda aplicar fungicidas foliares si las pústulas se detectan temprano y el clima "
                "pronostica humedad continua.\n"
                "• Aplicaciones de Triazoles combinados con Estrobirulinas son el estándar de la industria. "
                "Sin embargo, el agricultor debe evaluar el costo/beneficio: si la planta ya está cerca de la "
                "madurez fisiológica, el tratamiento químico rara vez justifica el costo."
            )
        },
        {
            "name": "Healthy",
            "display_name": "Healthy (Planta Sana)",
            "description": (
                "Esta clase es el estándar de oro de tu modelo. Cuando el modelo arroje este resultado, "
                "el sistema puede recomendar buenas prácticas agrícolas para asegurar que el cultivo se mantenga "
                "en este estado."
            ),
            "symptoms": (
                "La planta presenta hojas verdes uniformes, sin pústulas, lesiones foliares ni clorosis atípica. "
                "El crecimiento de los tallos y raíces sigue los parámetros normales para su variedad y etapa."
            ),
            "favored_conditions": (
                "Condiciones óptimas de desarrollo general: equilibrio de agua, luz solar y nutrientes en el suelo."
            ),
            "preventive_management": (
                "• Monitoreo constante (Scouting): Caminar el campo (o usar tu modelo con drones/maquinaria) cada "
                "7-14 días, prestando especial atención a las hojas inferiores donde la humedad se estanca.\n"
                "• Espaciamiento adecuado: Sembrar con la densidad correcta permite que el viento circule entre "
                "las plantas de maíz, secando el rocío de las hojas y creando un microclima hostil para los hongos."
            ),
            "treatment": (
                "• Nutrición del suelo: Mantener niveles adecuados de nitrógeno y potasio, ya que una planta "
                "bien nutrida tiene defensas naturales más fuertes.\n"
                "• Control biológico: El uso preventivo de hongos benéficos en el suelo o en la semilla, como "
                "Trichoderma, ayuda a fortalecer la raíz y reducir los inóculos de patógenos en la tierra."
            )
        }
    ]

    for item in classes_to_seed:
        existing = db.query(CornClass).filter(CornClass.name == item["name"]).first()
        if not existing:
            new_class = CornClass(
                name=item["name"],
                display_name=item["display_name"],
                description=item["description"],
                symptoms=item["symptoms"],
                favored_conditions=item["favored_conditions"],
                preventive_management=item["preventive_management"],
                treatment=item["treatment"]
            )
            db.add(new_class)
            db.commit()
            print(f"[*] Class '{item['name']}' successfully seeded.")
        else:
            print(f"[*] Class '{item['name']}' already exists. Skipping.")
