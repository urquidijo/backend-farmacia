import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // ===== MARCAS =====
  const marcas = await Promise.all([
    prisma.marca.upsert({ where: { nombre: "Genfar" }, update: {}, create: { nombre: "Genfar" } }),
    prisma.marca.upsert({ where: { nombre: "Bagó" }, update: {}, create: { nombre: "Bagó" } }),
    prisma.marca.upsert({ where: { nombre: "Isdin" }, update: {}, create: { nombre: "Isdin" } }),
    prisma.marca.upsert({ where: { nombre: "Huggies" }, update: {}, create: { nombre: "Huggies" } }),
    prisma.marca.upsert({ where: { nombre: "Bayer" }, update: {}, create: { nombre: "Bayer" } }),
    prisma.marca.upsert({ where: { nombre: "La Roche-Posay" }, update: {}, create: { nombre: "La Roche-Posay" } }),
    prisma.marca.upsert({ where: { nombre: "Nestlé" }, update: {}, create: { nombre: "Nestlé" } }),
    prisma.marca.upsert({ where: { nombre: "Abbott" }, update: {}, create: { nombre: "Abbott" } }),
  ])

  // ===== CATEGORÍAS =====
  const categorias = await Promise.all([
    prisma.categoria.upsert({ where: { nombre: "Analgésicos" }, update: {}, create: { nombre: "Analgésicos" } }),
    prisma.categoria.upsert({ where: { nombre: "Dermocosmética" }, update: {}, create: { nombre: "Dermocosmética" } }),
    prisma.categoria.upsert({ where: { nombre: "Bebés" }, update: {}, create: { nombre: "Bebés" } }),
    prisma.categoria.upsert({ where: { nombre: "Vitaminas" }, update: {}, create: { nombre: "Vitaminas" } }),
    prisma.categoria.upsert({ where: { nombre: "Antigripales" }, update: {}, create: { nombre: "Antigripales" } }),
    prisma.categoria.upsert({ where: { nombre: "Cuidado Capilar" }, update: {}, create: { nombre: "Cuidado Capilar" } }),
    prisma.categoria.upsert({ where: { nombre: "Nutrición" }, update: {}, create: { nombre: "Nutrición" } }),
    prisma.categoria.upsert({ where: { nombre: "Antibióticos" }, update: {}, create: { nombre: "Antibióticos" } }),
    prisma.categoria.upsert({ where: { nombre: "Antihistamínicos" }, update: {}, create: { nombre: "Antihistamínicos" } }),
    prisma.categoria.upsert({ where: { nombre: "Gastrointestinal" }, update: {}, create: { nombre: "Gastrointestinal" } }),
    prisma.categoria.upsert({ where: { nombre: "Respiratorio" }, update: {}, create: { nombre: "Respiratorio" } }),
    prisma.categoria.upsert({ where: { nombre: "Antisépticos y Curaciones" }, update: {}, create: { nombre: "Antisépticos y Curaciones" } }),
    prisma.categoria.upsert({ where: { nombre: "Antimicóticos" }, update: {}, create: { nombre: "Antimicóticos" } }),
    prisma.categoria.upsert({ where: { nombre: "Antieméticos" }, update: {}, create: { nombre: "Antieméticos" } }),
    prisma.categoria.upsert({ where: { nombre: "Antihipertensivos" }, update: {}, create: { nombre: "Antihipertensivos" } }),
    prisma.categoria.upsert({ where: { nombre: "Antidiabéticos" }, update: {}, create: { nombre: "Antidiabéticos" } }),
    prisma.categoria.upsert({ where: { nombre: "Cardiometabólico" }, update: {}, create: { nombre: "Cardiometabólico" } }),
    prisma.categoria.upsert({ where: { nombre: "Salud Sexual" }, update: {}, create: { nombre: "Salud Sexual" } }),
    prisma.categoria.upsert({ where: { nombre: "Dermatológicos" }, update: {}, create: { nombre: "Dermatológicos" } }),
  ])

  // ===== UNIDADES =====
  const unidades = await Promise.all([
    prisma.unidad.upsert({ where: { codigo: "COMP" }, update: {}, create: { codigo: "COMP", nombre: "Comprimidos" } }),
    prisma.unidad.upsert({ where: { codigo: "ML" }, update: {}, create: { codigo: "ML", nombre: "Mililitros" } }),
    prisma.unidad.upsert({ where: { codigo: "UNI" }, update: {}, create: { codigo: "UNI", nombre: "Unidades" } }),
    prisma.unidad.upsert({ where: { codigo: "GR" }, update: {}, create: { codigo: "GR", nombre: "Gramos" } }),
    prisma.unidad.upsert({ where: { codigo: "CAPS" }, update: {}, create: { codigo: "CAPS", nombre: "Cápsulas" } }),
    prisma.unidad.upsert({ where: { codigo: "GTS" }, update: {}, create: { codigo: "GTS", nombre: "Gotas" } }),
    prisma.unidad.upsert({ where: { codigo: "AMP" }, update: {}, create: { codigo: "AMP", nombre: "Ampollas" } }),
    prisma.unidad.upsert({ where: { codigo: "SOB" }, update: {}, create: { codigo: "SOB", nombre: "Sobres" } }),
    prisma.unidad.upsert({ where: { codigo: "SPR" }, update: {}, create: { codigo: "SPR", nombre: "Spray" } }),
    prisma.unidad.upsert({ where: { codigo: "PAR" }, update: {}, create: { codigo: "PAR", nombre: "Parches" } }),
    prisma.unidad.upsert({ where: { codigo: "JBE" }, update: {}, create: { codigo: "JBE", nombre: "Jarabe (ml)" } }),
    prisma.unidad.upsert({ where: { codigo: "SUS" }, update: {}, create: { codigo: "SUS", nombre: "Suspensión (ml)" } }),
    prisma.unidad.upsert({ where: { codigo: "TIRA" }, update: {}, create: { codigo: "TIRA", nombre: "Tiras" } }),
    prisma.unidad.upsert({ where: { codigo: "PCS" }, update: {}, create: { codigo: "PCS", nombre: "Piezas" } }),
    prisma.unidad.upsert({ where: { codigo: "INH" }, update: {}, create: { codigo: "INH", nombre: "Inhalador" } }),
    prisma.unidad.upsert({ where: { codigo: "CREM" }, update: {}, create: { codigo: "CREM", nombre: "Crema (g)" } }),
    prisma.unidad.upsert({ where: { codigo: "GEL" }, update: {}, create: { codigo: "GEL", nombre: "Gel (g)" } }),
    prisma.unidad.upsert({ where: { codigo: "SOL" }, update: {}, create: { codigo: "SOL", nombre: "Solución (ml)" } }),
  ])

  // ===== HELPERS =====
  const findMarca = (nombre: string) => marcas.find(m => m.nombre === nombre)!.id
  const findCategoria = (nombre: string) => categorias.find(c => c.nombre === nombre)!.id
  const findUnidad = (codigo: string) => unidades.find(u => u.codigo === codigo)!.id

  // ===== PRODUCTOS BASE =====
  const productosBase = [
    { nombre: "Paracetamol 500mg x10", descripcion: "Analgésico/antipirético", stockMinimo: 20, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Ibuprofeno 400mg x10", descripcion: "AINE para dolor e inflamación", stockMinimo: 15, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Protector Solar FPS50 50ml", descripcion: "Protección solar amplia", stockMinimo: 10, marcaId: findMarca("Isdin"), categoriaId: findCategoria("Dermocosmética"), unidadId: findUnidad("ML") },
    { nombre: "Pañales M x36", descripcion: "Para 6-10kg", stockMinimo: 5, marcaId: findMarca("Huggies"), categoriaId: findCategoria("Bebés"), unidadId: findUnidad("UNI") },
    { nombre: "Crema Hidratante Facial 50ml", descripcion: "Con ácido hialurónico", stockMinimo: 8, marcaId: findMarca("Isdin"), categoriaId: findCategoria("Dermocosmética"), unidadId: findUnidad("ML") },
    { nombre: "Vitamina C 1000mg x30", descripcion: "Soporte inmune", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Omega 3 1000mg x60", descripcion: "EPA/DHA", stockMinimo: 10, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Jarabe para la Tos 120ml", descripcion: "Antitusivo y expectorante", stockMinimo: 6, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antigripales"), unidadId: findUnidad("JBE") },
    { nombre: "Spray Antibacterial Manos 60ml", descripcion: "Higienizante sin enjuague", stockMinimo: 20, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Dermocosmética"), unidadId: findUnidad("SPR") },
  ]

  // ===== +34 MEDICAMENTOS COMUNES ADICIONALES =====
  const productosExtra = [
    // Analgésicos / antiinflamatorios
    { nombre: "Naproxeno 550mg x10", descripcion: "AINE analgesia prolongada", stockMinimo: 16, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Diclofenaco Potásico 50mg x20", descripcion: "AINE de acción rápida", stockMinimo: 18, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Ketorolaco 10mg x10", descripcion: "Analgésico potente uso corto", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Metamizol 500mg x20", descripcion: "Analgésico y antipirético", stockMinimo: 15, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Ibuprofeno Gel Tópico 5% 60g", descripcion: "Alivio local dolor muscular", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("GEL") },

    // Antihistamínicos / antigripales / respiratorio
    { nombre: "Loratadina 10mg x10", descripcion: "Antihistamínico no sedante", stockMinimo: 20, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antihistamínicos"), unidadId: findUnidad("COMP") },
    { nombre: "Cetirizina 10mg x10", descripcion: "Alergias y rinitis", stockMinimo: 20, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antihistamínicos"), unidadId: findUnidad("COMP") },
    { nombre: "Desloratadina 5mg x10", descripcion: "Alivio prolongado alergias", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antihistamínicos"), unidadId: findUnidad("COMP") },
    { nombre: "Ambroxol Jarabe 120ml", descripcion: "Mucolítico y expectorante", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Respiratorio"), unidadId: findUnidad("JBE") },
    { nombre: "Guaifenesina Jarabe 120ml", descripcion: "Expectorante", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Respiratorio"), unidadId: findUnidad("JBE") },
    { nombre: "Salbutamol Inhalador 100mcg", descripcion: "Broncodilatador de rescate", stockMinimo: 8, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Respiratorio"), unidadId: findUnidad("INH") },
    { nombre: "Budesonida/Formoterol Inhalador", descripcion: "Control de asma/COPD", stockMinimo: 6, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Respiratorio"), unidadId: findUnidad("INH") },
    { nombre: "Paracetamol Pediátrico Gotas 30ml", descripcion: "Antipirético pediátrico", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("GTS") },

    // Gastrointestinal
    { nombre: "Omeprazol 20mg x14", descripcion: "IBP protector gástrico", stockMinimo: 20, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("CAPS") },
    { nombre: "Pantoprazol 40mg x14", descripcion: "IBP 24h", stockMinimo: 12, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("COMP") },
    { nombre: "Domperidona 10mg x10", descripcion: "Antiemético y procinético", stockMinimo: 14, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("COMP") },
    { nombre: "Ondansetrón 8mg x10", descripcion: "Antiemético potente", stockMinimo: 8, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Antieméticos"), unidadId: findUnidad("COMP") },
    { nombre: "Loperamida 2mg x10", descripcion: "Antidiarreico", stockMinimo: 16, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("CAPS") },
    { nombre: "Hidróxido Al/Mg Suspensión 200ml", descripcion: "Antiácido", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("SUS") },
    { nombre: "Sales de Rehidratación Oral x10", descripcion: "Rehidratación oral", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("SOB") },

    // Antibióticos
    { nombre: "Amoxicilina 500mg x12", descripcion: "Antibiótico penicilina", stockMinimo: 18, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("CAPS") },
    { nombre: "Amoxicilina/Clavulánico 875/125 x14", descripcion: "Amplio espectro", stockMinimo: 12, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("COMP") },
    { nombre: "Azitromicina 500mg x3", descripcion: "Macrólido 3 días", stockMinimo: 14, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("COMP") },
    { nombre: "Ciprofloxacino 500mg x10", descripcion: "Fluoroquinolona", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("COMP") },
    { nombre: "Metronidazol 500mg x10", descripcion: "Anaerobios/parasitosis", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("COMP") },
    { nombre: "Nitrofurantoína 100mg x14", descripcion: "ITU no complicada", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("CAPS") },

    // Antimicóticos / dermatológicos
    { nombre: "Clotrimazol Crema 1% 20g", descripcion: "Antimicótico tópico", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antimicóticos"), unidadId: findUnidad("CREM") },
    { nombre: "Miconazol Polvo 2% 60g", descripcion: "Antimicótico en polvo", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antimicóticos"), unidadId: findUnidad("GR") },
    { nombre: "Ketoconazol Shampoo 2% 120ml", descripcion: "Anticaspa/antimicótico", stockMinimo: 8, marcaId: findMarca("La Roche-Posay"), categoriaId: findCategoria("Cuidado Capilar"), unidadId: findUnidad("ML") },
    { nombre: "Hidrocortisona Crema 1% 20g", descripcion: "Corticoide tópico leve", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Dermatológicos"), unidadId: findUnidad("CREM") },
    { nombre: "Betametasona Crema 0.05% 20g", descripcion: "Corticoide tópico", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Dermatológicos"), unidadId: findUnidad("CREM") },

    // Antisépticos y curaciones
    { nombre: "Alcohol 70% 1L", descripcion: "Antiséptico de uso general", stockMinimo: 6, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("ML") },
    { nombre: "Povidona Yodada 10% 120ml", descripcion: "Antiséptico tópico", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("SOL") },
    { nombre: "Agua Oxigenada 10 vol 120ml", descripcion: "Limpieza de heridas", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("ML") },
    { nombre: "Gasas Estériles x10", descripcion: "Curación de heridas", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("UNI") },

    // Crónicos (cardiometabólicos)
    { nombre: "Enalapril 10mg x30", descripcion: "IECA antihipertensivo", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antihipertensivos"), unidadId: findUnidad("COMP") },
    { nombre: "Losartán 50mg x30", descripcion: "ARA II", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antihipertensivos"), unidadId: findUnidad("COMP") },
    { nombre: "Amlodipino 5mg x30", descripcion: "Calcioantagonista", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antihipertensivos"), unidadId: findUnidad("COMP") },
    { nombre: "Atorvastatina 20mg x30", descripcion: "Hipolipemiante", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Cardiometabólico"), unidadId: findUnidad("COMP") },
    { nombre: "Metformina 850mg x30", descripcion: "Antidiabético oral", stockMinimo: 14, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antidiabéticos"), unidadId: findUnidad("COMP") },
    { nombre: "Glibenclamida 5mg x30", descripcion: "Sulfonilurea", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antidiabéticos"), unidadId: findUnidad("COMP") },

    // Salud sexual
    { nombre: "Levonorgestrel 1.5mg x1", descripcion: "Anticoncepción de emergencia", stockMinimo: 6, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Salud Sexual"), unidadId: findUnidad("UNI") },
  ]

  // ===== +50 PRODUCTOS ADICIONALES =====
  const productosExtra2 = [
    // Analgésicos / AINEs
    { nombre: "Acetaminofén 650mg x20", descripcion: "Analgésico y antipirético", stockMinimo: 20, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Paracetamol 1g efervescente x10", descripcion: "Tabletas efervescentes para dolor/fiebre", stockMinimo: 12, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("SOB") },
    { nombre: "Ibuprofeno 600mg x20", descripcion: "AINE para dolor moderado", stockMinimo: 18, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Diclofenaco Sódico 50mg x20", descripcion: "AINE antiinflamatorio", stockMinimo: 16, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Meloxicam 15mg x10", descripcion: "AINE de dosis diaria", stockMinimo: 12, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Tramadol 50mg x10", descripcion: "Analgésico opioide (uso con receta)", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Naproxeno Sódico 275mg x20", descripcion: "AINE de acción prolongada", stockMinimo: 16, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },
    { nombre: "Paracetamol + Cafeína 500/65mg x10", descripcion: "Analgésico con potenciador", stockMinimo: 14, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Analgésicos"), unidadId: findUnidad("COMP") },

    // Dermatológicos / tópicos
    { nombre: "Valerato de Betametasona Loción 60ml", descripcion: "Corticoide tópico para prurito", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Dermatológicos"), unidadId: findUnidad("SOL") },
    { nombre: "Loción de Calamina 120ml", descripcion: "Alivio de picazón e irritación", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Dermatológicos"), unidadId: findUnidad("SOL") },

    // Antihistamínicos / respiratorio / antigripales
    { nombre: "Clorfeniramina 4mg x10", descripcion: "Antihistamínico clásico", stockMinimo: 20, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antihistamínicos"), unidadId: findUnidad("COMP") },
    { nombre: "Fexofenadina 120mg x10", descripcion: "Antihistamínico no sedante", stockMinimo: 16, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antihistamínicos"), unidadId: findUnidad("COMP") },
    { nombre: "Montelukast 10mg x10", descripcion: "Antileucotrieno para rinitis/asma", stockMinimo: 10, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Respiratorio"), unidadId: findUnidad("COMP") },
    { nombre: "Dextrometorfano Jarabe 120ml", descripcion: "Antitusivo", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antigripales"), unidadId: findUnidad("JBE") },
    { nombre: "Fenilefrina + Paracetamol x12", descripcion: "Alivio de resfriado común", stockMinimo: 18, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antigripales"), unidadId: findUnidad("SOB") },
    { nombre: "Oxolamina Jarabe 120ml", descripcion: "Antitusivo y antiinflamatorio de vías aéreas", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Respiratorio"), unidadId: findUnidad("JBE") },
    { nombre: "Xilometazolina Spray Nasal 10ml", descripcion: "Descongestivo nasal", stockMinimo: 12, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antigripales"), unidadId: findUnidad("SPR") },
    { nombre: "Fluticasona Nasal 50mcg", descripcion: "Corticoide nasal para rinitis", stockMinimo: 8, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Respiratorio"), unidadId: findUnidad("SPR") },
    { nombre: "Carbocisteína Jarabe 120ml", descripcion: "Mucolítico", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Respiratorio"), unidadId: findUnidad("JBE") },

    // Gastrointestinal
    { nombre: "Famotidina 20mg x20", descripcion: "Antagonista H2 para acidez", stockMinimo: 18, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("COMP") },
    { nombre: "Esomeprazol 40mg x14", descripcion: "IBP de 24 horas", stockMinimo: 12, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("CAPS") },
    { nombre: "Sucralfato Suspensión 200ml", descripcion: "Protector de mucosa gástrica", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("SUS") },
    { nombre: "Bromuro de Hioscina 10mg x10", descripcion: "Antiespasmódico", stockMinimo: 14, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("COMP") },
    { nombre: "Lactulosa Jarabe 200ml", descripcion: "Laxante osmótico", stockMinimo: 10, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("JBE") },
    { nombre: "Simeticona Gotas 30ml", descripcion: "Antiflatulento", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("GTS") },
    { nombre: "Ondansetrón 4mg x10", descripcion: "Antiemético", stockMinimo: 10, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Antieméticos"), unidadId: findUnidad("COMP") },
    { nombre: "Probióticos x10 sobres", descripcion: "Restablece flora intestinal", stockMinimo: 10, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("SOB") },
    { nombre: "SRO Sabor Cítrico x10 sobres", descripcion: "Sales de rehidratación oral", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Gastrointestinal"), unidadId: findUnidad("SOB") },

    // Antibióticos
    { nombre: "Amoxicilina Suspensión 250mg/5ml 100ml", descripcion: "Antibiótico pediátrico", stockMinimo: 10, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("SUS") },
    { nombre: "Cefalexina 500mg x12", descripcion: "Cefalosporina 1ª gen.", stockMinimo: 12, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("CAPS") },
    { nombre: "Cefuroxima 500mg x10", descripcion: "Cefalosporina 2ª gen.", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("COMP") },
    { nombre: "Doxiciclina 100mg x10", descripcion: "Tetraciclina de amplio espectro", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("CAPS") },
    { nombre: "Claritromicina 500mg x10", descripcion: "Macrólido", stockMinimo: 10, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("COMP") },
    { nombre: "Clindamicina 300mg x16", descripcion: "Lincosamida", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("CAPS") },
    { nombre: "SMX/TMP 800/160mg x14", descripcion: "Sulfametoxazol/Trimetoprim", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antibióticos"), unidadId: findUnidad("COMP") },

    // Antimicóticos / dermatológicos
    { nombre: "Mupirocina Pomada 2% 15g", descripcion: "Antibacteriano tópico", stockMinimo: 8, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Dermatológicos"), unidadId: findUnidad("CREM") },
    { nombre: "Neomicina/Bacitracina Ungüento 15g", descripcion: "Antibiótico tópico", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("CREM") },
    { nombre: "Nistatina Crema 100,000 UI 20g", descripcion: "Antimicótico tópico", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antimicóticos"), unidadId: findUnidad("CREM") },
    { nombre: "Terbinafina 250mg x14", descripcion: "Antimicótico sistémico", stockMinimo: 10, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Antimicóticos"), unidadId: findUnidad("COMP") },
    { nombre: "Fluconazol 150mg x1", descripcion: "Dosis única para candidiasis", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antimicóticos"), unidadId: findUnidad("CAPS") },

    // Antisépticos y curaciones
    { nombre: "Clorhexidina Enjuague 0.12% 250ml", descripcion: "Antiséptico bucal", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("ML") },
    { nombre: "Gasas Elásticas x5", descripcion: "Curaciones y fijación", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("UNI") },
    { nombre: "Vendaje Elástico 10cm x1", descripcion: "Sujeción y compresión", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("UNI") },
    { nombre: "Apositos Adhesivos x20", descripcion: "Pequeñas heridas y cortes", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("UNI") },
    { nombre: "Jeringas 3ml x10", descripcion: "Uso general", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("UNI") },

    // Crónicos / dispositivos
    { nombre: "Glucometro Kit", descripcion: "Medición de glucosa capilar", stockMinimo: 6, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Antidiabéticos"), unidadId: findUnidad("PCS") },
    { nombre: "Tiras Reactivas Glucosa x100", descripcion: "Monitoreo de glucemia", stockMinimo: 10, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Antidiabéticos"), unidadId: findUnidad("TIRA") },
    { nombre: "Lancetas para Punción x100", descripcion: "Uso con puncionador", stockMinimo: 10, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Antidiabéticos"), unidadId: findUnidad("UNI") },
    { nombre: "Esfigmomanómetro Digital", descripcion: "Control de presión arterial", stockMinimo: 4, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Cardiometabólico"), unidadId: findUnidad("PCS") },

    // Vitaminas / nutrición
    { nombre: "Multivitamínico Adulto x30", descripcion: "Vitaminas y minerales esenciales", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Hierro + Ácido Fólico x30", descripcion: "Soporte hematínico", stockMinimo: 12, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Calcio + Vitamina D x60", descripcion: "Soporte óseo", stockMinimo: 12, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Zinc 50mg x30", descripcion: "Soporte inmune/piel", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },

    // Bebés / cuidado personal
    { nombre: "Crema para Rozaduras 50g", descripcion: "Protección de la piel del bebé", stockMinimo: 10, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Bebés"), unidadId: findUnidad("CREM") },
    { nombre: "Shampoo Suave Bebé 200ml", descripcion: "Limpieza delicada", stockMinimo: 10, marcaId: findMarca("Huggies"), categoriaId: findCategoria("Bebés"), unidadId: findUnidad("ML") },
    { nombre: "Algodón Hidrófilo 100g", descripcion: "Aseo y curaciones", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antisépticos y Curaciones"), unidadId: findUnidad("GR") },

    // Cardiometabólico / antihipertensivos adicionales
    { nombre: "Hidroclorotiazida 25mg x30", descripcion: "Diurético tiazídico", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Antihipertensivos"), unidadId: findUnidad("COMP") },
    { nombre: "Bisoprolol 5mg x30", descripcion: "Betabloqueador", stockMinimo: 10, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Antihipertensivos"), unidadId: findUnidad("COMP") },
    { nombre: "Aspirina 100mg x30", descripcion: "Antiagregante plaquetario", stockMinimo: 12, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Cardiometabólico"), unidadId: findUnidad("COMP") },
  ]

  // ===== +40 SUPLEMENTOS, VITAMINAS Y PROTEÍNAS =====
  const productosExtra3 = [
    // Multivitamínicos
    { nombre: "Multivitamínico Mujer x60", descripcion: "Complejo de vitaminas y minerales para mujer", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Multivitamínico Hombre x60", descripcion: "Complejo de vitaminas y minerales para hombre", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Multivitamínico Senior 50+ x60", descripcion: "Soporte integral para adultos mayores", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },

    // Vitaminas y minerales específicos
    { nombre: "Vitamina B12 1000mcg x60", descripcion: "Energía y salud neurológica", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Complejo B x60", descripcion: "Vitaminas del grupo B", stockMinimo: 12, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Vitamina E 400 UI x60", descripcion: "Antioxidante", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Vitamina A 5000 UI x60", descripcion: "Salud ocular y piel", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Vitamina K2 + D3 x60", descripcion: "Soporte óseo y cardiovascular", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Magnesio Citrato 200mg x90", descripcion: "Músculos y nervios", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Calcio Citrato + Vit D x120", descripcion: "Salud ósea", stockMinimo: 12, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Zinc + Vitamina C x60", descripcion: "Apoyo inmune", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Hierro Quelado 28mg x30", descripcion: "Soporte hematínico", stockMinimo: 10, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Ácido Fólico 1mg x30", descripcion: "Apoyo prenatal y hematopoyesis", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },

    // Prenatales / Omega
    { nombre: "Prenatal Multivitamínico x30", descripcion: "Vitaminas y minerales para embarazo", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "DHA Prenatal 200mg x30", descripcion: "Ácido docosahexaenoico para desarrollo fetal", stockMinimo: 10, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },
    { nombre: "Omega 3 Triple Strength x60", descripcion: "EPA/DHA alta concentración", stockMinimo: 12, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },
    { nombre: "Coenzima Q10 100mg x30", descripcion: "Salud cardiovascular y energía", stockMinimo: 8, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },

    // Articular / huesos
    { nombre: "Glucosamina + Condroitina x60", descripcion: "Salud articular", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("COMP") },
    { nombre: "Colágeno Hidrolizado 300g", descripcion: "Piel, cabello y articulaciones", stockMinimo: 8, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("GR") },
    { nombre: "Colágeno + Vitamina C 300g", descripcion: "Síntesis de colágeno y antioxidante", stockMinimo: 8, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("GR") },

    // Proteínas y deportivos
    { nombre: "Proteína Whey 1kg", descripcion: "Concentrado de suero de leche", stockMinimo: 6, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("GR") },
    { nombre: "Proteína Isolate 900g", descripcion: "Aislado de suero de rápida absorción", stockMinimo: 6, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("GR") },
    { nombre: "Mass Gainer 3kg", descripcion: "Ganador de peso con carbohidratos", stockMinimo: 4, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("GR") },
    { nombre: "Creatina Monohidratada 300g", descripcion: "Rendimiento y fuerza muscular", stockMinimo: 10, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("GR") },
    { nombre: "BCAA 2:1:1 300g", descripcion: "Aminoácidos de cadena ramificada", stockMinimo: 8, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("GR") },
    { nombre: "L-Carnitina 500mg x60", descripcion: "Metabolismo de grasas", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },

    // Sueño / bienestar
    { nombre: "Melatonina 3mg x60", descripcion: "Apoyo al sueño", stockMinimo: 12, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("COMP") },
    { nombre: "Valeriana 200mg x60", descripcion: "Relajación y descanso", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },
    { nombre: "Passiflora 250mg x60", descripcion: "Calma natural", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },

    // Botanicals / “naturales”
    { nombre: "Ginseng 500mg x60", descripcion: "Energía y vitalidad", stockMinimo: 10, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },
    { nombre: "Maca Andina 500mg x60", descripcion: "Rendimiento y vitalidad", stockMinimo: 10, marcaId: findMarca("Bagó"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },
    { nombre: "Spirulina 500mg x100", descripcion: "Superalimento rico en proteínas y micronutrientes", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },
    { nombre: "Chlorella 500mg x100", descripcion: "Alga verde con clorofila", stockMinimo: 10, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },
    { nombre: "Cranberry 500mg x60", descripcion: "Apoyo vías urinarias", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },
    { nombre: "Saw Palmetto 320mg x60", descripcion: "Salud prostática", stockMinimo: 8, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Salud Sexual"), unidadId: findUnidad("CAPS") },
    { nombre: "Cardo Mariano 250mg x60", descripcion: "Desintoxicación hepática", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("CAPS") },

    // Hidratación / RTD / snacks
    { nombre: "Electrolitos en Polvo x20 sobres", descripcion: "Rehidratación y recuperación", stockMinimo: 12, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("SOB") },
    { nombre: "Bebida Isotónica en Polvo x10 sobres", descripcion: "Reposición de sales y energía", stockMinimo: 10, marcaId: findMarca("Abbott"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("SOB") },
    { nombre: "Barras de Proteína x12", descripcion: "Snack alto en proteína", stockMinimo: 8, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("PCS") },
    { nombre: "Batido Proteico Listo 330ml x6", descripcion: "Bebida proteica lista para tomar", stockMinimo: 6, marcaId: findMarca("Nestlé"), categoriaId: findCategoria("Nutrición"), unidadId: findUnidad("PCS") },

    // Salud cabello/piel/uñas
    { nombre: "Biotina 10,000mcg x60", descripcion: "Cabello, piel y uñas", stockMinimo: 10, marcaId: findMarca("Bayer"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
    { nombre: "Keratina + Colágeno x60", descripcion: "Fortalecimiento capilar", stockMinimo: 8, marcaId: findMarca("Genfar"), categoriaId: findCategoria("Vitaminas"), unidadId: findUnidad("CAPS") },
  ]

  // ===== ARMADO FINAL =====
  const productos = [
    ...productosBase,
    ...productosExtra,
    ...productosExtra2,
    ...productosExtra3,
  ]

  // ===== INSERCIÓN EN BD =====
  const existingProducts = await prisma.producto.count()

  if (existingProducts === 0) {
    await prisma.producto.createMany({ data: productos })
  } else {
    for (const p of productos) {
      const exists = await prisma.producto.findFirst({ where: { nombre: p.nombre } })
      if (!exists) await prisma.producto.create({ data: p })
    }
  }

  console.log("✅ Datos de farmacia cargados exitosamente")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
