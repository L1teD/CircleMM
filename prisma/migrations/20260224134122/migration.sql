/*
  Warnings:

  - Added the required column `modIndex` to the `PoolEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `poolentry` ADD COLUMN `modIndex` INTEGER NOT NULL;
