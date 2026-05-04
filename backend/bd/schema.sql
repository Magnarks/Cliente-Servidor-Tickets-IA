CREATE TABLE `usuarios` (
  `idusuarios` int(11) NOT NULL AUTO_INCREMENT,
  `nombreusuario` varchar(85) NOT NULL,
  `correousuario` varchar(85) NOT NULL,
  `avatarusuario` varchar(85) NOT NULL,
  `token` varchar(340) NOT NULL,
  `expiracion_token` varchar(45) NOT NULL,
  `permisos` varchar(85) NOT NULL,
  `ultimo_logeo` datetime NOT NULL,
  PRIMARY KEY (`idusuarios`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tickets` (
  `idtickets` int(11) NOT NULL AUTO_INCREMENT,
  `asunto` varchar(85) NOT NULL,
  `descripcion` longtext NOT NULL,
  `autor` varchar(85) NOT NULL,
  `asignado_a` varchar(85) NOT NULL,
  `estado` varchar(45) NOT NULL,
  `prioridad` varchar(45) NOT NULL,
  `fechaCreacion` datetime NOT NULL,
  `fechaActualizacion` datetime NOT NULL,
  `comentarios` JSON DEFAULT NULL,
  `adjuntos` JSON DEFAULT NULL,
  PRIMARY KEY (`idtickets`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `historial_chatbot` (
  `idhistorial_chatbot` int(11) NOT NULL AUTO_INCREMENT,
  `usuario` varchar(85) NOT NULL,
  `fecha_conversacion` datetime NOT NULL,
  `historial_chat` JSON DEFAULT NULL,
  PRIMARY KEY (`idhistorial_chatbot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
