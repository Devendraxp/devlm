import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  documentUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      {
        maxFileSize: "16MB",
        maxFileCount: 5,
      },
    "text/plain": { maxFileSize: "4MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Derive a clean file type label
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "unknown";
      const fileTypeMap: Record<string, string> = {
        pdf: "pdf",
        docx: "docx",
        pptx: "pptx",
        txt: "txt",
        doc: "docx",
        ppt: "pptx",
      };
      const fileType = fileTypeMap[ext] ?? ext;

      const document = await prisma.document.create({
        data: {
          userId: metadata.userId,
          fileName: file.name,
          fileType,
          fileUrl: file.ufsUrl,
          sizeBytes: file.size,
          status: "PENDING",
        },
      });

      return { documentId: document.id, fileType };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
