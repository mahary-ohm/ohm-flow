-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "grdId" TEXT,
ADD COLUMN     "haulogyTicketNumber" TEXT,
ADD COLUMN     "pdlPce" TEXT;

-- CreateTable
CREATE TABLE "Grd" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grd_name_key" ON "Grd"("name");

-- CreateIndex
CREATE INDEX "Grd_isActive_name_idx" ON "Grd"("isActive", "name");

-- CreateIndex
CREATE INDEX "Ticket_grdId_idx" ON "Ticket"("grdId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_grdId_fkey" FOREIGN KEY ("grdId") REFERENCES "Grd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
