import { BadRequestException, Injectable } from "@nestjs/common";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import {
  KNOWLEDGE_MAX_CONTENT_CHARS,
  KNOWLEDGE_MAX_UPLOAD_BYTES,
  KNOWLEDGE_UPLOAD_EXTENSIONS,
} from "@growvisi/shared";

export type ParsedKnowledgeUpload = {
  text: string;
  filename: string;
  truncated: boolean;
};

@Injectable()
export class KnowledgeParseService {
  async parseUpload(file: Express.Multer.File): Promise<ParsedKnowledgeUpload> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("No file uploaded.");
    }
    if (file.size > KNOWLEDGE_MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `File is too large. Maximum size is ${Math.round(KNOWLEDGE_MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      );
    }

    const filename = sanitizeFilename(file.originalname || "document");
    const ext = fileExtension(filename);
    if (!KNOWLEDGE_UPLOAD_EXTENSIONS.includes(ext as (typeof KNOWLEDGE_UPLOAD_EXTENSIONS)[number])) {
      throw new BadRequestException(
        `Unsupported file type. Upload ${KNOWLEDGE_UPLOAD_EXTENSIONS.join(", ")} only.`,
      );
    }

    const raw = await this.extractText(file.buffer, ext);
    const trimmed = raw.replace(/\u0000/g, "").trim();
    if (!trimmed) {
      throw new BadRequestException(
        "Could not extract readable text from this file. Try a text-based PDF or paste the content instead.",
      );
    }

    const truncated = trimmed.length > KNOWLEDGE_MAX_CONTENT_CHARS;
    const text = truncated ? trimmed.slice(0, KNOWLEDGE_MAX_CONTENT_CHARS) : trimmed;

    return { text, filename, truncated };
  }

  titleFromFilename(filename: string): string {
    const base = filename.replace(/\.[^.]+$/, "").trim();
    return base.slice(0, 200) || "Uploaded document";
  }

  private async extractText(buffer: Buffer, ext: string): Promise<string> {
    switch (ext) {
      case ".txt":
        return buffer.toString("utf8");
      case ".pdf": {
        const result = await pdfParse(buffer);
        return result.text ?? "";
      }
      case ".docx": {
        const result = await mammoth.extractRawText({ buffer });
        return result.value ?? "";
      }
      default:
        throw new BadRequestException("Unsupported file type.");
    }
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\]/g, "_").slice(0, 255);
}

function fileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? "";
}
