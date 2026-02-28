/*
  Warnings:

  - You are about to drop the column `updatedAd` on the `map` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAd` on the `mappool` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAd` on the `poolentry` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAd` on the `user` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Map` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Mappool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PoolEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `map` DROP COLUMN `updatedAd`,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `mappool` DROP COLUMN `updatedAd`,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `avgStars` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `poolentry` DROP COLUMN `updatedAd`,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `updatedAd`,
    ADD COLUMN `matchCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `MatchRecord` (
    `id` VARCHAR(191) NOT NULL,
    `bestOf` INTEGER NOT NULL,
    `status` ENUM('COMPLETED', 'CANCELLED', 'FORFEITED') NOT NULL,
    `teamAPlayerIds` VARCHAR(191) NOT NULL,
    `teamBPlayerIds` VARCHAR(191) NOT NULL,
    `teamAName` VARCHAR(191) NOT NULL,
    `teamBName` VARCHAR(191) NOT NULL,
    `scoreA` INTEGER NOT NULL DEFAULT 0,
    `scoreB` INTEGER NOT NULL DEFAULT 0,
    `winner` ENUM('A', 'B') NULL,
    `poolId` INTEGER NULL,
    `mpLink` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MappoolBanRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matchId` VARCHAR(191) NOT NULL,
    `poolId` INTEGER NOT NULL,
    `bannedBy` ENUM('A', 'B') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MapBanRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matchId` VARCHAR(191) NOT NULL,
    `mapId` INTEGER NOT NULL,
    `bannedBy` ENUM('A', 'B') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MapPickRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matchId` VARCHAR(191) NOT NULL,
    `mapId` INTEGER NOT NULL,
    `pickedBy` ENUM('A', 'B') NOT NULL,
    `pickOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerMapResult` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matchId` VARCHAR(191) NOT NULL,
    `mapId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `score` BIGINT NOT NULL,
    `accuracy` DOUBLE NOT NULL,
    `mods` VARCHAR(191) NOT NULL,
    `team` ENUM('A', 'B') NOT NULL,
    `winner` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MatchRecord` ADD CONSTRAINT `MatchRecord_poolId_fkey` FOREIGN KEY (`poolId`) REFERENCES `Mappool`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MappoolBanRecord` ADD CONSTRAINT `MappoolBanRecord_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `MatchRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MapBanRecord` ADD CONSTRAINT `MapBanRecord_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `MatchRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MapPickRecord` ADD CONSTRAINT `MapPickRecord_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `MatchRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMapResult` ADD CONSTRAINT `PlayerMapResult_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `MatchRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMapResult` ADD CONSTRAINT `PlayerMapResult_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
