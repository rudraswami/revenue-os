jest.mock("pdf-parse", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("mammoth", () => ({
  __esModule: true,
  default: {
    extractRawText: jest.fn(async () => ({ value: "DOCX policy and refund terms." })),
  },
  extractRawText: jest.fn(async () => ({ value: "DOCX policy and refund terms." })),
}));

import { BadRequestException } from "@nestjs/common";
import pdfParse from "pdf-parse";
import { KnowledgeParseService } from "./knowledge-parse.service";

const mockedPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

describe("KnowledgeParseService", () => {
  const service = new KnowledgeParseService();

  function file(originalname: string, buffer: Buffer): Express.Multer.File {
    return {
      fieldname: "file",
      originalname,
      encoding: "7bit",
      mimetype: "application/octet-stream",
      size: buffer.length,
      buffer,
      stream: undefined as never,
      destination: "",
      filename: originalname,
      path: "",
    };
  }

  beforeEach(() => {
    mockedPdfParse.mockResolvedValue({
      text: "PDF extracted pricing details for 2BHK interior.",
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "v1.10.100",
    } as Awaited<ReturnType<typeof pdfParse>>);
  });

  it("parses plain text files", async () => {
    const result = await service.parseUpload(
      file("rate-card.txt", Buffer.from("Starter plan ₹999/mo\nGrowth ₹2999/mo")),
    );
    expect(result.text).toContain("₹999");
    expect(result.filename).toBe("rate-card.txt");
    expect(result.truncated).toBe(false);
  });

  it("parses pdf files", async () => {
    const result = await service.parseUpload(file("pricing.pdf", Buffer.from("%PDF-1.4")));
    expect(result.text).toContain("PDF extracted");
    expect(result.truncated).toBe(false);
  });

  it("parses docx files", async () => {
    const result = await service.parseUpload(file("policy.docx", Buffer.from("PK\x03\x04")));
    expect(result.text).toContain("DOCX policy");
  });

  it("rejects unsupported extensions", async () => {
    await expect(
      service.parseUpload(file("sheet.xlsx", Buffer.from("data"))),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects empty extracted text", async () => {
    mockedPdfParse.mockResolvedValueOnce({
      text: "   ",
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "v1.10.100",
    } as Awaited<ReturnType<typeof pdfParse>>);
    await expect(
      service.parseUpload(file("blank.pdf", Buffer.from("%PDF"))),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("derives title from filename", () => {
    expect(service.titleFromFilename("2BHK-pricing.pdf")).toBe("2BHK-pricing");
  });
});
