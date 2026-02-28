/*
  Warnings:

  - You are about to drop the column `hp` on the `map` table. All the data in the column will be lost.
  - Added the required column `avgStars` to the `Mappool` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `map` DROP COLUMN `hp`;

-- AlterTable
ALTER TABLE `mappool` ADD COLUMN `avgStars` DOUBLE NOT NULL;
