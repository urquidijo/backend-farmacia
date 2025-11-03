import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ReportesService } from './reportes.service';

export interface CommandResult {
  response: string;
  transcript?: string;
  correctedCommand?: string;
  action?: string;
  reportData?: any;
  reportType?: string;
  fileData?: string;
  fileName?: string;
  mimeType?: string;
}

@Injectable()
export class VoiceAssistantService {
  private genAI: GoogleGenerativeAI;

  constructor(private readonly reportesService: ReportesService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async processAudio(
    audioBase64: string,
    mimeType: string,
    userId: number,
  ): Promise<CommandResult> {
    try {
      // Step 1: Transcribe audio using Gemini
      const transcript = await this.transcribeAudio(audioBase64, mimeType);

      // Step 2: Parse command from transcript
      const parsedCommand = await this.parseCommandWithGemini(transcript);

      // Step 3: Execute the command
      if (parsedCommand.action === 'generar_reporte') {
        const result = await this.handleReportGeneration(parsedCommand, userId);
        return {
          ...result,
          transcript,
        };
      }

      return {
        transcript,
        response: 'No pude entender el comando. Por favor intenta de nuevo.',
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }

  async processCommand(command: string, userId: number): Promise<CommandResult> {
    try {
      console.log('[VoiceAssistant] Processing command:', command);

      // Use Gemini to parse the command
      const parsedCommand = await this.parseCommandWithGemini(command);
      console.log('[VoiceAssistant] Parsed command:', parsedCommand);

      // Execute the corresponding action
      if (parsedCommand.action === 'generar_reporte') {
        const result = await this.handleReportGeneration(parsedCommand, userId);

        // Add corrected command to response
        return {
          ...result,
          correctedCommand: `Generar reporte de ${parsedCommand.reportType} en formato ${parsedCommand.format}`,
        };
      }

      return {
        response: 'No pude entender el comando. Por favor intenta de nuevo.',
      };
    } catch (error) {
      console.error('[VoiceAssistant] Error processing command:', error);
      throw error;
    }
  }

  private async transcribeAudio(
    audioBase64: string,
    mimeType: string,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Transcribe el siguiente audio en español. El audio contiene un comando para generar reportes en un sistema de farmacia.
Devuelve SOLO el texto transcrito, sin explicaciones adicionales.`;

      const result = await model.generateContent([
        {
          inlineData: {
            data: audioBase64,
            mimeType,
          },
        },
        prompt,
      ]);

      const response = result.response;
      const transcript = response.text().trim();

      return transcript;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Error al transcribir el audio');
    }
  }

  private async parseCommandWithGemini(command: string): Promise<any> {
    const systemPrompt = `Eres un asistente inteligente para el panel de administración de una farmacia.
Tu tarea es analizar comandos de voz (que pueden tener errores de transcripción) y extraer la información necesaria para generar reportes.

IMPORTANTE: Debes ser muy tolerante a errores de transcripción y usar contexto para corregir automáticamente:
- "dedeportes" o "de deportes" probablemente significa "reportes"
- "bitacora" puede escribirse como "bitácora", "bitakora", "vicacora", etc.
- "alertas" puede aparecer como "a hertas", "alerthas", etc.
- "clientes" puede aparecer como "cliente", "clientez", etc.
- "facturas" puede aparecer como "factura", "faktura", etc.

Los tipos de reportes disponibles son:
1. ALERTAS - Reportes de inventario bajo stock (palabras clave: alerta, alert, stock, inventario)
2. BITACORA - Registros de seguridad del sistema (palabras clave: bitácora, bitacora, log, registro, seguridad)
3. CLIENTES - Información de clientes registrados (palabras clave: cliente, usuario, customer)
4. FACTURAS - Reportes de ventas y facturas (palabras clave: factura, venta, pedido, orden)

Los formatos disponibles son: PDF, EXCEL, HTML
- Si el usuario no especifica formato, usa PDF por defecto
- "Excel" puede aparecer como "excel", "exel", "excell", etc.
- "PDF" puede aparecer como "pdf", "PD F", etc.

FILTROS DE FECHA:
- Si el usuario NO especifica fechas o intervalo: deja "fechaInicio" y "fechaFin" como null (se exportarán TODOS los registros de la tabla)
- Si el usuario menciona "último mes" o "mes pasado": usa el valor "último mes" para fechaInicio
- Si el usuario menciona "última semana" o "semana pasada": usa el valor "última semana" para fechaInicio
- Si el usuario especifica fechas concretas: úsalas en formato YYYY-MM-DD

OTROS FILTROS:
- Si no especifica tipo para bitácora, deja "tipo" como null (incluirá todos los tipos)
- Si no especifica formato, usa "PDF" por defecto

Responde SOLO con un objeto JSON con la siguiente estructura:
{
  "action": "generar_reporte",
  "reportType": "ALERTAS|BITACORA|CLIENTES|FACTURAS",
  "format": "PDF|EXCEL|HTML",
  "filters": {
    "fechaInicio": null,
    "fechaFin": null,
    "tipo": null
  }
}

Ejemplos de comandos:
- "genera reportes de alertas" -> {"action":"generar_reporte","reportType":"ALERTAS","format":"PDF","filters":{"fechaInicio":null,"fechaFin":null,"tipo":null}} // Sin fechas = TODOS los registros
- "quiero reporte de bitacora" -> {"action":"generar_reporte","reportType":"BITACORA","format":"PDF","filters":{"fechaInicio":null,"fechaFin":null,"tipo":null}} // Sin fechas = TODOS
- "exporta bitácora a excel" -> {"action":"generar_reporte","reportType":"BITACORA","format":"EXCEL","filters":{"fechaInicio":null,"fechaFin":null,"tipo":null}} // Sin fechas = TODOS
- "dame reporte de facturas" -> {"action":"generar_reporte","reportType":"FACTURAS","format":"PDF","filters":{"fechaInicio":null,"fechaFin":null,"tipo":null}} // Sin fechas = TODOS
- "genera alertas en PDF" -> {"action":"generar_reporte","reportType":"ALERTAS","format":"PDF","filters":{"fechaInicio":null,"fechaFin":null,"tipo":null}} // Sin fechas = TODOS
- "reporte de clientes del último mes" -> {"action":"generar_reporte","reportType":"CLIENTES","format":"PDF","filters":{"fechaInicio":"último mes","fechaFin":null,"tipo":null}} // Usuario mencionó "último mes"
- "exporta facturas de la última semana en excel" -> {"action":"generar_reporte","reportType":"FACTURAS","format":"EXCEL","filters":{"fechaInicio":"última semana","fechaFin":null,"tipo":null}} // Usuario mencionó "última semana"
- "bitácora del mes pasado" -> {"action":"generar_reporte","reportType":"BITACORA","format":"PDF","filters":{"fechaInicio":"último mes","fechaFin":null,"tipo":null}} // "mes pasado" = "último mes"

Comando del usuario (puede tener errores): "${command}"`;

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo parsear el comando');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private async handleReportGeneration(
    parsedCommand: any,
    userId: number,
  ): Promise<CommandResult> {
    const { reportType, format, filters } = parsedCommand;

    // Process date filters
    const processedFilters = this.processFilters(filters);

    // Generate the report
    let reportData;
    switch (reportType) {
      case 'ALERTAS':
        reportData = await this.reportesService.generateAlertasReport(
          format,
          processedFilters,
        );
        break;
      case 'BITACORA':
        reportData = await this.reportesService.generateBitacoraReport(
          format,
          processedFilters,
        );
        break;
      case 'CLIENTES':
        reportData = await this.reportesService.generateClientesReport(
          format,
          processedFilters,
        );
        break;
      case 'FACTURAS':
        reportData = await this.reportesService.generateFacturasReport(
          format,
          processedFilters,
        );
        break;
      default:
        throw new Error('Tipo de reporte no válido');
    }

    // Generate response message based on filters
    let responseMessage = `Reporte de ${reportType} generado exitosamente en formato ${format}.`;

    if (!processedFilters.fechaInicio && !processedFilters.fechaFin) {
      responseMessage += ` Se exportaron TODOS los registros. Total: ${reportData.data.length} registros.`;
    } else {
      responseMessage += ` Intervalo: ${processedFilters.fechaInicio} a ${processedFilters.fechaFin}. Total: ${reportData.data.length} registros.`;
    }

    return {
      response: responseMessage,
      action: 'generar_reporte',
      reportType,
      reportData: reportData.data,
      fileData: reportData.fileData,
      fileName: reportData.fileName,
      mimeType: reportData.mimeType,
    };
  }

  private processFilters(filters: any): any {
    const processed = { ...filters };

    // If no dates specified, leave as null to get ALL records
    if (!filters.fechaInicio && !filters.fechaFin) {
      processed.fechaInicio = null;
      processed.fechaFin = null;

      console.log('[VoiceAssistant] No dates specified - will fetch ALL records');
    }

    // Handle "último mes" string value (when user explicitly mentions it)
    if (filters.fechaInicio === 'último mes') {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      processed.fechaInicio = lastMonth.toISOString().split('T')[0];
      processed.fechaFin = today.toISOString().split('T')[0];

      console.log('[VoiceAssistant] User requested último mes:', {
        fechaInicio: processed.fechaInicio,
        fechaFin: processed.fechaFin,
      });
    }

    // Handle "última semana" string value
    if (filters.fechaInicio === 'última semana') {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      processed.fechaInicio = lastWeek.toISOString().split('T')[0];
      processed.fechaFin = today.toISOString().split('T')[0];

      console.log('[VoiceAssistant] User requested última semana:', {
        fechaInicio: processed.fechaInicio,
        fechaFin: processed.fechaFin,
      });
    }

    return processed;
  }
}
