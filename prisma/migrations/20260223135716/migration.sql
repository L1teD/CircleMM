-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL,
    `discordId` VARCHAR(191) NULL,
    `elo` DOUBLE NOT NULL DEFAULT 1000,
    `peakElo` DOUBLE NOT NULL DEFAULT 1000,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAd` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Map` (
    `id` INTEGER NOT NULL,
    `artist` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `stars` DOUBLE NOT NULL,
    `cs` DOUBLE NOT NULL,
    `ar` DOUBLE NOT NULL,
    `od` DOUBLE NOT NULL,
    `hp` DOUBLE NOT NULL,
    `bpm` DOUBLE NOT NULL,
    `length` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAd` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PoolEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mapId` INTEGER NOT NULL,
    `poolId` INTEGER NOT NULL,
    `mod` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAd` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mappool` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAd` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lobby` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hostId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NULL,
    `mode` VARCHAR(191) NULL,
    `autoLeave` INTEGER NULL,
    `status` ENUM('OPEN', 'QUEUING', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lobby_hostId_key`(`hostId`),
    UNIQUE INDEX `Lobby_guestId_key`(`guestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LobbyInvite` (
    `id` VARCHAR(191) NOT NULL,
    `lobbyId` INTEGER NOT NULL,
    `toId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LobbyInvite_lobbyId_toId_key`(`lobbyId`, `toId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PoolEntry` ADD CONSTRAINT `PoolEntry_mapId_fkey` FOREIGN KEY (`mapId`) REFERENCES `Map`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PoolEntry` ADD CONSTRAINT `PoolEntry_poolId_fkey` FOREIGN KEY (`poolId`) REFERENCES `Mappool`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lobby` ADD CONSTRAINT `Lobby_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `User`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lobby` ADD CONSTRAINT `Lobby_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `User`(`discordId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LobbyInvite` ADD CONSTRAINT `LobbyInvite_lobbyId_fkey` FOREIGN KEY (`lobbyId`) REFERENCES `Lobby`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
