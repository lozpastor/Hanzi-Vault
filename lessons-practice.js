const HANZI_LEVELS = [
  { title: '1 · Primeros intercambios', goal: 'Preséntate, pide aclaraciones y habla de tu día.', ids: ['saludos', 'reparar', 'rutina'] },
  { title: '2 · Autonomía cotidiana', goal: 'Resuelve compras, comidas y desplazamientos por la ciudad.', ids: ['comida', 'metro', 'pago', 'planes'] },
  { title: '3 · Viajes e imprevistos', goal: 'Gestiona viajes, visitas y situaciones que requieren ayuda.', ids: ['hotel', 'tren', 'casa', 'salud', 'perdidas'] },
];

const HANZI_PRACTICE = {
  saludos: ['Cambia el nombre de Ana por el tuyo. Después añade de dónde eres.', 'La otra persona ya se ha presentado. Salúdala, di tu nombre y dile que te alegra conocerla.', [2, 4, 5]],
  reparar: ['Contrasta wǒ méi tīngdǒng, que cuenta lo que acaba de pasar, con wǒ míngbai le, que confirma que ahora entiendes.', 'Oyes un precio demasiado rápido. Pide que lo repitan despacio. Si sigues sin entender, pide que lo escriban.', [4, 2, 7]],
  rutina: ['Compara wǒ zài gōngzuò, «estoy trabajando», con wǒ jīntiān bú shàngbān, «hoy no trabajo».', 'Te preguntan qué haces ahora y si tienes tiempo esta noche. Contesta con dos frases.', [1, 3, 9]],
  comida: ['Compara la pregunta yào là ma con bú yào là. Practica alternando el papel de cliente y camarero.', 'Pide fideos sin picante y agua. Al acabar, pide la cuenta.', [1, 3, 6, 9]],
  metro: ['Repite la indicación y cambia zuǒ, «izquierda», por yòu, «derecha».', 'Encuentras el metro, pero necesitas saber qué línea tomar, dónde cambiar y en qué parada bajarte.', [5, 6, 7]],
  pago: ['块 kuài es una forma coloquial de decir «yuan» al hablar de precios. Prueba a cambiar treinta por veinte, èrshí.', 'Pregunta el precio. El código no funciona. Pregunta si puedes pagar en efectivo y pide un recibo.', [0, 6, 5, 9]],
  planes: ['Compara zěnmeyàng, que pide opinión, con jǐ diǎn, que pregunta la hora.', 'No puedes quedar mañana. Propón un café el fin de semana y fija un punto de encuentro.', [6, 0, 4]],
  hotel: ['Usa jǐ diǎn para preguntar una hora exacta. Practica con el desayuno y la salida.', 'Haz el registro, pregunta a qué hora hay que salir y explica que el aire acondicionado no funciona.', [0, 5, 8, 9]],
  tren: ['Practica distinguir chūfā, «salir», de dào, «llegar». Pregunta ambas horas seguidas.', 'Compra un billete para mañana por la mañana. Pregunta la hora de salida y dónde pasar el control.', [0, 2, 4, 6]],
  casa: ['Practica nǐmen para hablar a varias personas. Con una sola, usa nǐ.', 'Te invitan a cenar. Ofrece ayuda, elogia un plato y agradece la invitación al despedirte.', [5, 6, 8, 9]],
  salud: ['从 cóng marca el punto de partida. Sustituye «anoche» por jīntiān zǎoshang, «esta mañana».', 'Explica que te duele la cabeza desde anoche y pide ver a un médico.', [1, 3, 7]],
  perdidas: ['可能 kěnéng expresa que algo es posible. Practica diciendo dónde crees que dejaste el móvil.', 'Has perdido el móvil. Explica dónde crees que se quedó y pregunta por objetos perdidos.', [0, 2, 5]],
};
