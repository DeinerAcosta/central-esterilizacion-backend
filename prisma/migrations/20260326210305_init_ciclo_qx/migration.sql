-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `codigoVerificacion` VARCHAR(191) NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `empresa` VARCHAR(191) NOT NULL,
    `cargo` VARCHAR(191) NULL,
    `usuario` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `foto` VARCHAR(191) NULL,
    `rol` VARCHAR(191) NOT NULL DEFAULT 'Administrador',
    `esPropietario` BOOLEAN NOT NULL DEFAULT false,
    `registroContable` BOOLEAN NOT NULL DEFAULT false,
    `permisos` JSON NULL,
    `esPasswordProvisional` BOOLEAN NOT NULL DEFAULT true,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_codigo_key`(`codigo`),
    UNIQUE INDEX `Usuario_usuario_key`(`usuario`),
    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Especialidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Especialidad_codigo_key`(`codigo`),
    UNIQUE INDEX `Especialidad_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subespecialidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `especialidadId` INTEGER NOT NULL,

    UNIQUE INDEX `Subespecialidad_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipoSubespecialidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `subespecialidadId` INTEGER NOT NULL,

    UNIQUE INDEX `TipoSubespecialidad_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Marca` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Marca_codigo_key`(`codigo`),
    UNIQUE INDEX `Marca_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnidadMedida` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `UnidadMedida_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Presentacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Presentacion_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsumoQuirurgico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `unidadMedidaId` INTEGER NOT NULL,
    `presentacionId` INTEGER NOT NULL,
    `proveedorId` INTEGER NULL,
    `requiereEsterilizacion` BOOLEAN NOT NULL DEFAULT false,
    `tipoEsterilizacion` VARCHAR(191) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InsumoQuirurgico_codigo_key`(`codigo`),
    UNIQUE INDEX `InsumoQuirurgico_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Proveedor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `nit` VARCHAR(191) NOT NULL,
    `pais` VARCHAR(191) NOT NULL,
    `ciudad` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Proveedor_codigo_key`(`codigo`),
    UNIQUE INDEX `Proveedor_nit_key`(`nit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sede` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `pais` VARCHAR(191) NOT NULL DEFAULT 'Colombia',
    `ciudad` VARCHAR(191) NOT NULL DEFAULT '',
    `direccion` VARCHAR(191) NULL DEFAULT '',
    `responsable` VARCHAR(191) NULL DEFAULT '',
    `estado` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Sede_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quirofano` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `sedeId` INTEGER NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Quirofano_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigoKit` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `numeroKit` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'Habilitado',
    `especialidadId` INTEGER NOT NULL,
    `subespecialidadId` INTEGER NOT NULL,
    `tipoSubespecialidad` VARCHAR(191) NOT NULL,
    `sedeId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Kit_codigoKit_key`(`codigoKit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstrumentoEnKit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kitId` INTEGER NOT NULL,
    `instrumentoId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HojaVidaInstrumento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `especialidadId` INTEGER NOT NULL,
    `subespecialidadId` INTEGER NOT NULL,
    `tipoId` INTEGER NOT NULL,
    `proveedorId` INTEGER NOT NULL,
    `kitId` INTEGER NULL,
    `sedeId` INTEGER NULL,
    `marcaId` INTEGER NULL,
    `referencia` VARCHAR(191) NULL,
    `ciudad` VARCHAR(191) NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `fabricante` VARCHAR(191) NOT NULL,
    `paisOrigen` VARCHAR(191) NOT NULL,
    `numeroSerie` VARCHAR(191) NOT NULL,
    `registroInvima` VARCHAR(191) NOT NULL,
    `material` VARCHAR(191) NOT NULL,
    `materialOtro` VARCHAR(191) NULL,
    `esterilizacion` VARCHAR(191) NOT NULL,
    `frecuenciaMantenimiento` VARCHAR(191) NOT NULL,
    `proximoMantenimiento` DATETIME(3) NULL,
    `fechaMantenimientoRef` DATETIME(3) NULL,
    `observacionesTecnico` TEXT NULL,
    `estadoActual` VARCHAR(191) NOT NULL DEFAULT 'P. registrar',
    `cicloEsterilizacion` INTEGER NOT NULL DEFAULT 0,
    `propietarioId` INTEGER NOT NULL,
    `notasObservaciones` TEXT NULL,
    `fechaCompra` DATETIME(3) NULL,
    `costo` DOUBLE NULL,
    `iva` DOUBLE NULL,
    `numeroFactura` VARCHAR(191) NULL,
    `vidaUtil` DOUBLE NULL,
    `fotoUrl` VARCHAR(191) NULL,
    `garantiaUrl` VARCHAR(191) NULL,
    `registroInvimaUrl` VARCHAR(191) NULL,
    `codigoInstrumentoUrl` VARCHAR(191) NULL,
    `facturaUrl` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'P. registrar',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HojaVidaInstrumento_codigo_key`(`codigo`),
    UNIQUE INDEX `HojaVidaInstrumento_numeroSerie_key`(`numeroSerie`),
    UNIQUE INDEX `HojaVidaInstrumento_registroInvima_key`(`registroInvima`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistorialTraslado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `instrumentoId` INTEGER NULL,
    `kitId` INTEGER NULL,
    `sedeOrigenId` INTEGER NOT NULL,
    `sedeDestinoId` INTEGER NOT NULL,
    `fechaTraslado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaDevolucion` DATETIME(3) NOT NULL,
    `realizadoPor` VARCHAR(191) NULL DEFAULT 'Sistema',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `instrumentoId` INTEGER NOT NULL,
    `tipoDano` VARCHAR(191) NOT NULL,
    `evidenciaFotoUrl` VARCHAR(191) NULL,
    `reportadoPorId` INTEGER NOT NULL,
    `proveedorMantenimientoId` INTEGER NULL,
    `descripcionMantenimiento` TEXT NULL,
    `informeMantenimientoUrl` VARCHAR(191) NULL,
    `destinoFinal` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'Pendiente',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Reporte_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CicloEsterilizacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigoCiclo` VARCHAR(191) NOT NULL,
    `kitId` INTEGER NOT NULL,
    `etapaActual` INTEGER NOT NULL DEFAULT 0,
    `responsableActualId` INTEGER NULL,
    `tipoSellado` VARCHAR(191) NULL,
    `cintaTest` BOOLEAN NOT NULL DEFAULT false,
    `quimicoInterno` BOOLEAN NOT NULL DEFAULT false,
    `lote` VARCHAR(191) NULL,
    `observacionRotulado` TEXT NULL,
    `tipoEsterilizacion` VARCHAR(191) NULL,
    `indicadorUrl` VARCHAR(191) NULL,
    `destinoSet` VARCHAR(191) NULL,
    `quirofanoDestino` VARCHAR(191) NULL,
    `instrumentadorDestino` VARCHAR(191) NULL,
    `estadoGlobal` VARCHAR(191) NOT NULL DEFAULT 'En Curso',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CicloEsterilizacion_codigoCiclo_key`(`codigoCiclo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscaneoInstrumento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cicloId` INTEGER NOT NULL,
    `instrumentoId` INTEGER NOT NULL,
    `etapa` INTEGER NOT NULL,
    `estadoFisico` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Subespecialidad` ADD CONSTRAINT `Subespecialidad_especialidadId_fkey` FOREIGN KEY (`especialidadId`) REFERENCES `Especialidad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TipoSubespecialidad` ADD CONSTRAINT `TipoSubespecialidad_subespecialidadId_fkey` FOREIGN KEY (`subespecialidadId`) REFERENCES `Subespecialidad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsumoQuirurgico` ADD CONSTRAINT `InsumoQuirurgico_unidadMedidaId_fkey` FOREIGN KEY (`unidadMedidaId`) REFERENCES `UnidadMedida`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsumoQuirurgico` ADD CONSTRAINT `InsumoQuirurgico_presentacionId_fkey` FOREIGN KEY (`presentacionId`) REFERENCES `Presentacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsumoQuirurgico` ADD CONSTRAINT `InsumoQuirurgico_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quirofano` ADD CONSTRAINT `Quirofano_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `Sede`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kit` ADD CONSTRAINT `Kit_especialidadId_fkey` FOREIGN KEY (`especialidadId`) REFERENCES `Especialidad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kit` ADD CONSTRAINT `Kit_subespecialidadId_fkey` FOREIGN KEY (`subespecialidadId`) REFERENCES `Subespecialidad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kit` ADD CONSTRAINT `Kit_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `Sede`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstrumentoEnKit` ADD CONSTRAINT `InstrumentoEnKit_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstrumentoEnKit` ADD CONSTRAINT `InstrumentoEnKit_instrumentoId_fkey` FOREIGN KEY (`instrumentoId`) REFERENCES `HojaVidaInstrumento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaVidaInstrumento` ADD CONSTRAINT `HojaVidaInstrumento_especialidadId_fkey` FOREIGN KEY (`especialidadId`) REFERENCES `Especialidad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaVidaInstrumento` ADD CONSTRAINT `HojaVidaInstrumento_subespecialidadId_fkey` FOREIGN KEY (`subespecialidadId`) REFERENCES `Subespecialidad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaVidaInstrumento` ADD CONSTRAINT `HojaVidaInstrumento_tipoId_fkey` FOREIGN KEY (`tipoId`) REFERENCES `TipoSubespecialidad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaVidaInstrumento` ADD CONSTRAINT `HojaVidaInstrumento_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaVidaInstrumento` ADD CONSTRAINT `HojaVidaInstrumento_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaVidaInstrumento` ADD CONSTRAINT `HojaVidaInstrumento_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `Sede`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaVidaInstrumento` ADD CONSTRAINT `HojaVidaInstrumento_marcaId_fkey` FOREIGN KEY (`marcaId`) REFERENCES `Marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaVidaInstrumento` ADD CONSTRAINT `HojaVidaInstrumento_propietarioId_fkey` FOREIGN KEY (`propietarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialTraslado` ADD CONSTRAINT `HistorialTraslado_instrumentoId_fkey` FOREIGN KEY (`instrumentoId`) REFERENCES `HojaVidaInstrumento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialTraslado` ADD CONSTRAINT `HistorialTraslado_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialTraslado` ADD CONSTRAINT `HistorialTraslado_sedeOrigenId_fkey` FOREIGN KEY (`sedeOrigenId`) REFERENCES `Sede`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialTraslado` ADD CONSTRAINT `HistorialTraslado_sedeDestinoId_fkey` FOREIGN KEY (`sedeDestinoId`) REFERENCES `Sede`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reporte` ADD CONSTRAINT `Reporte_instrumentoId_fkey` FOREIGN KEY (`instrumentoId`) REFERENCES `HojaVidaInstrumento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reporte` ADD CONSTRAINT `Reporte_reportadoPorId_fkey` FOREIGN KEY (`reportadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reporte` ADD CONSTRAINT `Reporte_proveedorMantenimientoId_fkey` FOREIGN KEY (`proveedorMantenimientoId`) REFERENCES `Proveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CicloEsterilizacion` ADD CONSTRAINT `CicloEsterilizacion_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `Kit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CicloEsterilizacion` ADD CONSTRAINT `CicloEsterilizacion_responsableActualId_fkey` FOREIGN KEY (`responsableActualId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscaneoInstrumento` ADD CONSTRAINT `EscaneoInstrumento_cicloId_fkey` FOREIGN KEY (`cicloId`) REFERENCES `CicloEsterilizacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscaneoInstrumento` ADD CONSTRAINT `EscaneoInstrumento_instrumentoId_fkey` FOREIGN KEY (`instrumentoId`) REFERENCES `HojaVidaInstrumento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
