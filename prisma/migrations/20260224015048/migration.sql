/*
  Warnings:

  - Added the required column `elo` to the `Mappool` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mappool` ADD COLUMN `elo` INTEGER NOT NULL;
