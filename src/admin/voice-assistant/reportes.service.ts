import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportResult {
  data: any;
  fileData?: string; // Base64 encoded file
  fileName?: string;
  mimeType?: string;
}

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAlertasReport(
    format: string,
    filters: any,
  ): Promise<ReportResult> {
    // Get products with low stock (stockActual <= stockMinimo)
    const alertas = await this.prisma.producto.findMany({
      where: {
        activo: true,
      },
      include: {
        marca: true,
        categoria: true,
      },
      orderBy: {
        stockActual: 'asc',
      },
    });

    // Filter products where stockActual <= stockMinimo
    const filteredAlertas = alertas.filter(p => p.stockActual <= p.stockMinimo);

    const data = filteredAlertas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      marca: p.marca?.nombre || 'N/A',
      categoria: p.categoria?.nombre || 'N/A',
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      diferencia: p.stockActual - p.stockMinimo,
      precio: p.precio.toString(),
    }));

    const fileResult = this.generateFile('Alertas de Inventario', format, data, [
      { header: 'ID', dataKey: 'id' },
      { header: 'Producto', dataKey: 'nombre' },
      { header: 'Marca', dataKey: 'marca' },
      { header: 'Categoría', dataKey: 'categoria' },
      { header: 'Stock Actual', dataKey: 'stockActual' },
      { header: 'Stock Mínimo', dataKey: 'stockMinimo' },
      { header: 'Diferencia', dataKey: 'diferencia' },
      { header: 'Precio', dataKey: 'precio' },
    ]);

    return {
      data,
      ...fileResult,
    };
  }

  async generateBitacoraReport(
    format: string,
    filters: any,
  ): Promise<ReportResult> {
    const where: any = {};

    if (filters.fechaInicio && filters.fechaFin) {
      where.createdAt = {
        gte: new Date(filters.fechaInicio),
        lte: new Date(filters.fechaFin),
      };
    }

    if (filters.tipo) {
      where.estado = filters.tipo;
    }

    const registros = await this.prisma.bitacora.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      // No limit - fetch all records when no date filter
    });

    const data = registros.map((r) => ({
      id: r.id,
      estado: r.estado,
      acciones: r.acciones,
      usuario: r.user ? `${r.user.firstName} ${r.user.lastName} (${r.user.email})` : 'N/A',
      ip: r.ip || 'N/A',
      fecha: r.createdAt,
    }));

    const fileResult = this.generateFile('Bitácora de Seguridad', format, data, [
      { header: 'ID', dataKey: 'id' },
      { header: 'Estado', dataKey: 'estado' },
      { header: 'Acciones', dataKey: 'acciones' },
      { header: 'Usuario', dataKey: 'usuario' },
      { header: 'IP', dataKey: 'ip' },
      { header: 'Fecha', dataKey: 'fecha' },
    ]);

    return {
      data,
      ...fileResult,
    };
  }

  async generateClientesReport(
    format: string,
    filters: any,
  ): Promise<ReportResult> {
    const where: any = {
      roles: {
        some: {
          role: {
            name: 'CLIENTE',
          },
        },
      },
    };

    if (filters.fechaInicio && filters.fechaFin) {
      where.createdAt = {
        gte: new Date(filters.fechaInicio),
        lte: new Date(filters.fechaFin),
      };
    }

    const clientes = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        telefono: true,
        createdAt: true,
        _count: {
          select: {
            ordenes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const data = clientes.map((c) => ({
      id: c.id,
      nombre: `${c.firstName} ${c.lastName}`,
      email: c.email,
      telefono: c.telefono || 'N/A',
      fechaRegistro: c.createdAt,
      totalOrdenes: c._count.ordenes,
    }));

    const fileResult = this.generateFile('Reporte de Clientes', format, data, [
      { header: 'ID', dataKey: 'id' },
      { header: 'Nombre', dataKey: 'nombre' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Teléfono', dataKey: 'telefono' },
      { header: 'Fecha Registro', dataKey: 'fechaRegistro' },
      { header: 'Total Órdenes', dataKey: 'totalOrdenes' },
    ]);

    return {
      data,
      ...fileResult,
    };
  }

  async generateFacturasReport(
    format: string,
    filters: any,
  ): Promise<ReportResult> {
    const where: any = {};

    if (filters.fechaInicio && filters.fechaFin) {
      where.createdAt = {
        gte: new Date(filters.fechaInicio),
        lte: new Date(filters.fechaFin),
      };
    }

    const ordenes = await this.prisma.orden.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            producto: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      // No limit - fetch all records when no date filter
    });

    const data = ordenes.map((o) => ({
      id: o.id,
      cliente: `${o.user.firstName} ${o.user.lastName}`,
      email: o.user.email,
      fecha: o.createdAt,
      estado: o.estado,
      total: o.total.toString(),
      productos: o.items.length,
      detalleProductos: o.items
        .map((item) => `${item.producto.nombre} (${item.cantidad})`)
        .join(', '),
    }));

    const fileResult = this.generateFile('Reporte de Facturas', format, data, [
      { header: 'ID', dataKey: 'id' },
      { header: 'Cliente', dataKey: 'cliente' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Estado', dataKey: 'estado' },
      { header: 'Total', dataKey: 'total' },
      { header: '# Productos', dataKey: 'productos' },
      { header: 'Detalle', dataKey: 'detalleProductos' },
    ]);

    return {
      data,
      ...fileResult,
    };
  }

  private generateFile(
    title: string,
    format: string,
    data: any[],
    columns: { header: string; dataKey: string }[],
  ): { fileData: string; fileName: string; mimeType: string } {
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'PDF') {
      return this.generatePDF(title, data, columns, timestamp);
    } else if (format === 'EXCEL') {
      return this.generateExcel(title, data, columns, timestamp);
    } else if (format === 'HTML') {
      return this.generateHTML(title, data, columns, timestamp);
    }

    throw new Error(`Formato no soportado: ${format}`);
  }

  private generatePDF(
    title: string,
    data: any[],
    columns: { header: string; dataKey: string }[],
    timestamp: string,
  ): { fileData: string; fileName: string; mimeType: string } {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Add date
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 32);

    // Add table
    autoTable(doc, {
      startY: 40,
      head: [columns.map((col) => col.header)],
      body: data.map((row) =>
        columns.map((col) => {
          const value = row[col.dataKey];
          // Format dates
          if (value instanceof Date) {
            return value.toLocaleDateString('es-ES');
          }
          return value?.toString() || '';
        }),
      ),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] }, // Purple color
    });

    // Get PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    return {
      fileData: pdfBase64,
      fileName: `${title.replace(/\s/g, '_')}_${timestamp}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  private generateExcel(
    title: string,
    data: any[],
    columns: { header: string; dataKey: string }[],
    timestamp: string,
  ): { fileData: string; fileName: string; mimeType: string } {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Prepare data with headers
    const worksheetData = [
      columns.map((col) => col.header),
      ...data.map((row) =>
        columns.map((col) => {
          const value = row[col.dataKey];
          // Format dates
          if (value instanceof Date) {
            return value.toLocaleDateString('es-ES');
          }
          return value;
        }),
      ),
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Convert to base64
    const excelBase64 = Buffer.from(excelBuffer).toString('base64');

    return {
      fileData: excelBase64,
      fileName: `${title.replace(/\s/g, '_')}_${timestamp}.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private generateHTML(
    title: string,
    data: any[],
    columns: { header: string; dataKey: string }[],
    timestamp: string,
  ): { fileData: string; fileName: string; mimeType: string } {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #6366f1;
      margin-bottom: 10px;
    }
    .date {
      color: #666;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #6366f1;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background-color: #f9fafb;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #666;
      font-size: 14px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="date">Fecha: ${new Date().toLocaleDateString('es-ES')}</div>
    <table>
      <thead>
        <tr>
          ${columns.map((col) => `<th>${col.header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) => `
          <tr>
            ${columns
              .map((col) => {
                const value = row[col.dataKey];
                const displayValue =
                  value instanceof Date
                    ? value.toLocaleDateString('es-ES')
                    : value?.toString() || '';
                return `<td>${displayValue}</td>`;
              })
              .join('')}
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
    <div class="footer">
      <p>Total de registros: ${data.length}</p>
      <p>Generado el ${new Date().toLocaleString('es-ES')}</p>
    </div>
  </div>
</body>
</html>
    `;

    const htmlBase64 = Buffer.from(html).toString('base64');

    return {
      fileData: htmlBase64,
      fileName: `${title.replace(/\s/g, '_')}_${timestamp}.html`,
      mimeType: 'text/html',
    };
  }
}
