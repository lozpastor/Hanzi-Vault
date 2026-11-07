const HANZI_LESSONS = [
  ['saludos', 'Conocer a alguien', 'Saluda, preséntate y despídete.', 'Con 叫 jiào dices cómo te llamas. Cambia el nombre en wǒ jiào Ana para presentarte.', [0,1,2,3], 'Preséntate con tu nombre y pregunta el de la otra persona.',
`你好|nǐ hǎo|ni jao|Hola
你好，你叫什么名字？|nǐ hǎo, nǐ jiào shénme míngzi?|ni jao, ni chiao shen-me ming-ds|Hola, ¿cómo te llamas?
我叫安娜，你呢？|wǒ jiào Ānnà, nǐ ne?|uo chiao an-na, ni ne|Me llamo Ana, ¿y tú?
我叫小李。|wǒ jiào Xiǎo Lǐ.|uo chiao shiao li|Me llamo Xiao Li.
很高兴认识你。|hěn gāoxìng rènshi nǐ.|jen gao-shing ren-shi ni|Encantado de conocerte.
我是西班牙人。|wǒ shì Xībānyá rén.|uo shr shi-ban-ia ren|Soy de España.
你是哪儿人？|nǐ shì nǎr rén?|ni shr nar ren|¿De dónde eres?
我第一次来中国。|wǒ dì yī cì lái Zhōngguó.|uo di i ts lai yong-guo|Es mi primera vez en China.
谢谢！|xièxie!|shie-shie|¡Gracias!
再见！|zàijiàn!|dsai-chien|¡Adiós!`],
  ['reparar', 'Cuando no entiendes', 'Pide que repitan, hablen despacio o te lo enseñen.', '请 qǐng al principio suaviza una petición. Prueba qǐng + la acción que necesitas.', [0,1,2,3], 'Imagina que te hablan demasiado rápido. Pide que repitan y confirma el significado.',
`不好意思，我没听懂。|bù hǎoyìsi, wǒ méi tīngdǒng.|bu jao-i-s, uo mei ting-dong|Perdona, no he entendido.
我再说一遍。|wǒ zài shuō yí biàn.|uo dsai shuo i bien|Lo repito.
请说慢一点。|qǐng shuō màn yìdiǎn.|ching shuo man i-dien|Habla un poco más despacio, por favor.
好的，没问题。|hǎo de, méi wèntí.|jao de, mei uen-ti|Vale, sin problema.
你能再说一遍吗？|nǐ néng zài shuō yí biàn ma?|ni neng dsai shuo i bien ma|¿Puedes repetirlo?
这是什么意思？|zhè shì shénme yìsi?|ye shr shen-me i-s|¿Qué significa esto?
可以给我看一下吗？|kěyǐ gěi wǒ kàn yíxià ma?|ke-i guei uo kan i-shia ma|¿Puedes enseñármelo?
请写下来。|qǐng xiě xiàlai.|ching shie shia-lai|Escríbelo, por favor.
我只会说一点中文。|wǒ zhǐ huì shuō yìdiǎn Zhōngwén.|uo yr juei shuo i-dien yong-uen|Solo hablo un poco de chino.
我明白了。|wǒ míngbai le.|uo ming-bai le|Ya lo entiendo.`],
  ['rutina', 'Qué haces hoy', 'Habla de lo que haces ahora y de tus planes.', '在 zài + acción dice qué está pasando ahora. En wǒ zài chīfàn, estás comiendo en este momento.', [0,1,2,3], 'Di qué haces ahora, qué harás esta tarde y si estás libre esta noche.',
`你在干什么？|nǐ zài gàn shénme?|ni dsai gan shen-me|¿Qué estás haciendo?
我在吃饭。|wǒ zài chīfàn.|uo dsai chr-fan|Estoy comiendo.
你晚上有空吗？|nǐ wǎnshang yǒu kòng ma?|ni uan-shang iou kong ma|¿Estás libre esta noche?
有空。|yǒu kòng.|iou kong|Sí, estoy libre.
我在工作。|wǒ zài gōngzuò.|uo dsai gong-dsuo|Estoy trabajando.
我在休息。|wǒ zài xiūxi.|uo dsai shiou-shi|Estoy descansando.
你今天忙吗？|nǐ jīntiān máng ma?|ni chin-tien mang ma|¿Estás ocupado hoy?
我今天不上班。|wǒ jīntiān bú shàngbān.|uo chin-tien bu shang-ban|Hoy no trabajo.
下午我去超市。|xiàwǔ wǒ qù chāoshì.|shia-u uo chü chao-shr|Esta tarde voy al supermercado.
晚上我在家。|wǎnshang wǒ zài jiā.|uan-shang uo dsai chia|Esta noche estaré en casa.`],
  ['comida', 'Comer fuera', 'Pide comida, ajusta el picante y pide la cuenta.', '我要 wǒ yào + plato sirve para pedir. 请不要 qǐng bú yào + ingrediente sirve para pedir que lo omitan.', [0,1,2,3], 'Pide un plato y agua, pide que no pique y termina pidiendo la cuenta.',
`你想吃什么？|nǐ xiǎng chī shénme?|ni shiang chr shen-me|¿Qué quieres comer?
我要一碗面。|wǒ yào yì wǎn miàn.|uo iao i uan mien|Quiero un bol de fideos.
要辣吗？|yào là ma?|iao la ma|¿Lo quieres picante?
不要辣，谢谢。|bú yào là, xièxie.|bu iao la, shie-shie|Sin picante, gracias.
有菜单吗？|yǒu càidān ma?|iou tsai-dan ma|¿Hay carta?
这个是什么？|zhège shì shénme?|ye-gue shr shen-me|¿Qué es esto?
请给我一杯水。|qǐng gěi wǒ yì bēi shuǐ.|ching guei uo i bei shuei|Un vaso de agua, por favor.
我不吃肉。|wǒ bù chī ròu.|uo bu chr rou|No como carne.
可以打包吗？|kěyǐ dǎbāo ma?|ke-i da-bao ma|¿Me lo puedes poner para llevar?
买单，谢谢。|mǎidān, xièxie.|mai-dan, shie-shie|La cuenta, gracias.`],
  ['metro', 'Moverte por la ciudad', 'Pregunta cómo llegar y cómo cambiar de línea.', 'Para preguntar la ubicación, usa lugar + zài nǎr. Para preguntar el camino, usa qù + lugar + zěnme zǒu.', [0,1,2,3], 'Pregunta por el metro, confirma si está lejos y repite la indicación recibida.',
`请问，地铁站在哪儿？|qǐngwèn, dìtiězhàn zài nǎr?|ching-uen, di-tie-yan dsai nar|Perdona, ¿dónde está el metro?
往前走，然后左转。|wǎng qián zǒu, ránhòu zuǒzhuǎn.|uang chien dsou, ran-jou dsuo-yuan|Sigue recto y luego gira a la izquierda.
远吗？|yuǎn ma?|üen ma|¿Está lejos?
不远，走五分钟。|bù yuǎn, zǒu wǔ fēnzhōng.|bu üen, dsou u fen-yong|No, son cinco minutos andando.
去机场怎么走？|qù jīchǎng zěnme zǒu?|chü chi-chang dsen-me dsou|¿Cómo se va al aeropuerto?
坐几号线？|zuò jǐ hào xiàn?|dsuo chi jao shien|¿Qué línea cojo?
在哪儿换乘？|zài nǎr huànchéng?|dsai nar juan-cheng|¿Dónde hago transbordo?
在哪一站下车？|zài nǎ yí zhàn xià chē?|dsai na i yan shia che|¿En qué parada me bajo?
从哪个出口出去？|cóng nǎge chūkǒu chūqù?|tsong na-gue chu-kou chu-chü|¿Por qué salida salgo?
请在这儿停车。|qǐng zài zhèr tíngchē.|ching dsai yer ting-che|Pare aquí, por favor.`],
  ['pago', 'Compras y pagos', 'Pregunta precios y resuelve un pago que falla.', '可以 kěyǐ + acción + ma pregunta si algo se puede hacer. Cambia la acción para preguntar por otra forma de pago.', [0,1,2,3], 'Pregunta el precio e intenta pagar. Si falla, pregunta por otra forma de pago.',
`这个多少钱？|zhège duōshao qián?|ye-gue duo-shao chien|¿Cuánto cuesta esto?
三十块。|sānshí kuài.|san-shr kuai|Treinta yuanes.
可以用支付宝吗？|kěyǐ yòng Zhīfùbǎo ma?|ke-i iong yr-fu-bao ma|¿Puedo usar Alipay?
可以，请扫这个码。|kěyǐ, qǐng sǎo zhège mǎ.|ke-i, ching sao ye-gue ma|Sí, escanea este código.
可以用微信支付吗？|kěyǐ yòng Wēixìn zhīfù ma?|ke-i iong uei-shin yr-fu ma|¿Puedo pagar con WeChat Pay?
可以用现金吗？|kěyǐ yòng xiànjīn ma?|ke-i iong shien-chin ma|¿Puedo pagar en efectivo?
我扫不出来。|wǒ sǎo bu chūlái.|uo sao bu chu-lai|No consigo escanearlo.
付款没成功。|fùkuǎn méi chénggōng.|fu-kuan mei cheng-gong|El pago ha fallado.
我再试一次。|wǒ zài shì yí cì.|uo dsai shr i ts|Lo intento otra vez.
可以给我小票吗？|kěyǐ gěi wǒ xiǎopiào ma?|ke-i guei uo shiao-piao ma|¿Me das el recibo?`],
  ['hotel', 'Llegar al alojamiento', 'Regístrate, pregunta horarios y comunica una avería.', '没 méi + sustantivo expresa que algo falta. Usa méiyǒu para decir que no hay algo, como agua caliente.', [0,1,2,3], 'Haz el registro con tu nombre y llama a recepción porque no hay agua caliente.',
`你好，我订了房间。|nǐ hǎo, wǒ dìng le fángjiān.|ni jao, uo ding le fang-chien|Hola, tengo una reserva.
请给我看一下您的护照。|qǐng gěi wǒ kàn yíxià nín de hùzhào.|ching guei uo kan i-shia nin de ju-yao|Muéstreme su pasaporte, por favor.
给您。|gěi nín.|guei nin|Aquí tiene.
您的房间在三楼。|nín de fángjiān zài sān lóu.|nin de fang-chien dsai san lou|Su habitación está en la tercera planta.
早餐几点开始？|zǎocān jǐ diǎn kāishǐ?|dsao-tsan chi dien kai-shr|¿A qué hora empieza el desayuno?
几点退房？|jǐ diǎn tuìfáng?|chi dien tuei-fang|¿A qué hora hay que dejar la habitación?
无线网密码是多少？|wúxiànwǎng mìmǎ shì duōshao?|u-shien-uang mi-ma shr duo-shao|¿Cuál es la contraseña del wifi?
房间没有热水。|fángjiān méiyǒu rèshuǐ.|fang-chien mei-iou re-shuei|No hay agua caliente en la habitación.
空调坏了。|kōngtiáo huài le.|kong-tiao juai le|El aire acondicionado se ha estropeado.
可以帮我看一下吗？|kěyǐ bāng wǒ kàn yíxià ma?|ke-i bang uo kan i-shia ma|¿Podría echarle un vistazo?`],
  ['tren', 'Viajar en tren', 'Compra un billete y encuentra el acceso correcto.', '一张 yì zhāng significa «un» para billetes. Cambia yì por liǎng para pedir dos.', [0,1,2,3], 'Pide un billete a Shanghái para mañana y pregunta por el acceso al tren.',
`我想买一张去上海的票。|wǒ xiǎng mǎi yì zhāng qù Shànghǎi de piào.|uo shiang mai i yang chü shang-jai de piao|Quisiera un billete a Shanghái.
您想买哪天的？|nín xiǎng mǎi nǎ tiān de?|nin shiang mai na tien de|¿Para qué día lo quiere?
明天上午的。|míngtiān shàngwǔ de.|ming-tien shang-u de|Para mañana por la mañana.
还有票。|hái yǒu piào.|jai iou piao|Aún quedan billetes.
几点出发？|jǐ diǎn chūfā?|chi dien chu-fa|¿A qué hora sale?
几点到？|jǐ diǎn dào?|chi dien dao|¿A qué hora llega?
检票口在哪儿？|jiǎnpiàokǒu zài nǎr?|chien-piao-kou dsai nar|¿Dónde está el control de billetes?
这是几号车厢？|zhè shì jǐ hào chēxiāng?|ye shr chi jao che-shiang|¿Qué número de vagón es este?
这是我的座位。|zhè shì wǒ de zuòwèi.|ye shr uo de dsuo-uei|Este es mi asiento.
我可以改签吗？|wǒ kěyǐ gǎiqiān ma?|uo ke-i gai-chien ma|¿Puedo cambiar la reserva?`],
  ['planes', 'Quedar y hacer amigos', 'Propón un plan y acuerda hora y lugar.', '一起 yìqǐ antes de una acción indica que la hacéis juntos. Usa ba al final para proponer un plan.', [0,1,2,3], 'Invita a alguien a tomar algo y negocia una hora distinta.',
`周末一起喝咖啡吧？|zhōumò yìqǐ hē kāfēi ba?|you-mo i-chi je ka-fei ba|¿Tomamos un café el fin de semana?
好啊，几点？|hǎo a, jǐ diǎn?|jao a, chi dien|¡Vale! ¿A qué hora?
下午三点，怎么样？|xiàwǔ sān diǎn, zěnmeyàng?|shia-u san dien, dsen-me-iang|A las tres, ¿qué te parece?
可以，在哪儿见？|kěyǐ, zài nǎr jiàn?|ke-i, dsai nar chien|Me va bien. ¿Dónde quedamos?
在地铁站门口见。|zài dìtiězhàn ménkǒu jiàn.|dsai di-tie-yan men-kou chien|Nos vemos en la entrada del metro.
你明天有空吗？|nǐ míngtiān yǒu kòng ma?|ni ming-tien iou kong ma|¿Estás libre mañana?
我明天没空。|wǒ míngtiān méi kòng.|uo ming-tien mei kong|Mañana no puedo.
改天吧。|gǎitiān ba.|gai-tien ba|Otro día.
我快到了。|wǒ kuài dào le.|uo kuai dao le|Estoy a punto de llegar.
可以加你的微信吗？|kěyǐ jiā nǐ de Wēixìn ma?|ke-i chia ni de uei-shin ma|¿Te puedo añadir a WeChat?`],
  ['salud', 'Explicar cómo te encuentras', 'Describe síntomas y pide ayuda para ver a un médico.', 'Parte del cuerpo + téng expresa dónde duele. Wǒ tóu téng significa «me duele la cabeza».', [0,1,2,3], 'Describe dos síntomas y di desde cuándo los tienes.',
`你哪里不舒服？|nǐ nǎli bù shūfu?|ni na-li bu shu-fu|¿Qué molestias tienes?
我头疼。|wǒ tóu téng.|uo tou teng|Me duele la cabeza.
从什么时候开始的？|cóng shénme shíhou kāishǐ de?|tsong shen-me shr-jou kai-shr de|¿Cuándo empezó?
从昨天晚上开始的。|cóng zuótiān wǎnshang kāishǐ de.|tsong dsuo-tien uan-shang kai-shr de|Empezó anoche.
我肚子疼。|wǒ dùzi téng.|uo du-ds teng|Me duele la barriga.
我发烧了。|wǒ fāshāo le.|uo fa-shao le|Tengo fiebre.
我对花生过敏。|wǒ duì huāshēng guòmǐn.|uo duei jua-sheng guo-min|Soy alérgico a los cacahuetes.
我想看医生。|wǒ xiǎng kàn yīshēng.|uo shiang kan i-sheng|Quiero ver a un médico.
附近有医院吗？|fùjìn yǒu yīyuàn ma?|fu-chin iou i-üen ma|¿Hay un hospital cerca?
请帮我叫救护车。|qǐng bāng wǒ jiào jiùhùchē.|ching bang uo chiao chiou-ju-che|Llame a una ambulancia, por favor.`],
  ['perdidas', 'Perder algo o pedir ayuda', 'Explica qué falta y dónde lo viste por última vez.', '东西 dōngxi significa «cosa». Objeto + diū le expresa que lo has perdido. Sustituye el objeto según lo que busques.', [0,1,2,3], 'Explica que has perdido el móvil y di en qué lugar crees que lo dejaste.',
`不好意思，我的手机丢了。|bù hǎoyìsi, wǒ de shǒujī diū le.|bu jao-i-s, uo de shou-chi diou le|Perdona, he perdido el móvil.
你最后在哪儿用的？|nǐ zuìhòu zài nǎr yòng de?|ni dsuei-jou dsai nar iong de|¿Dónde lo usaste por última vez?
可能在出租车上。|kěnéng zài chūzūchē shang.|ke-neng dsai chu-dsu-che shang|Quizá en el taxi.
我帮你打个电话。|wǒ bāng nǐ dǎ ge diànhuà.|uo bang ni da gue dien-jua|Te ayudo a hacer una llamada.
我的护照找不到了。|wǒ de hùzhào zhǎo bu dào le.|uo de ju-yao yao bu dao le|No encuentro mi pasaporte.
失物招领处在哪儿？|shīwù zhāolǐngchù zài nǎr?|shr-u yao-ling-chu dsai nar|¿Dónde está objetos perdidos?
你见过这个包吗？|nǐ jiànguo zhège bāo ma?|ni chien-guo ye-gue bao ma|¿Has visto este bolso?
请帮我报警。|qǐng bāng wǒ bàojǐng.|ching bang uo bao-ching|Llame a la policía, por favor.
我迷路了。|wǒ mílù le.|uo mi-lu le|Me he perdido.
你能帮我一下吗？|nǐ néng bāng wǒ yíxià ma?|ni neng bang uo i-shia ma|¿Me puedes ayudar?`],
  ['casa', 'Visitar a alguien en casa', 'Acepta una invitación y participa en una comida familiar.', '给 gěi + persona indica a quién das algo. En zhè shì gěi nǐmen de, dices «esto es para vosotros».', [0,1,2,3], 'Saluda al llegar, entrega un pequeño regalo y agradece la comida.',
`欢迎，快进来！|huānyíng, kuài jìnlai!|juan-ing, kuai chin-lai|¡Bienvenido, pasa!
谢谢，这是给你们的。|xièxie, zhè shì gěi nǐmen de.|shie-shie, ye shr guei ni-men de|Gracias, esto es para vosotros.
太客气了，坐吧！|tài kèqi le, zuò ba!|tai ke-chi le, dsuo ba|¡Qué detalle! Siéntate.
谢谢，我坐这儿可以吗？|xièxie, wǒ zuò zhèr kěyǐ ma?|shie-shie, uo dsuo yer ke-i ma|Gracias, ¿puedo sentarme aquí?
要换鞋吗？|yào huàn xié ma?|iao juan shie ma|¿Tengo que cambiarme los zapatos?
我来帮忙吧。|wǒ lái bāngmáng ba.|uo lai bang-mang ba|Deja que ayude.
这个菜真好吃。|zhège cài zhēn hǎochī.|ye-gue tsai yen jao-chr|Este plato está riquísimo.
我吃饱了。|wǒ chī bǎo le.|uo chr bao le|Ya estoy lleno.
谢谢你们的招待。|xièxie nǐmen de zhāodài.|shie-shie ni-men de yao-dai|Gracias por la hospitalidad.
下次见！|xià cì jiàn!|shia ts chien|¡Hasta la próxima!`],
].map(([id, title, goal, pattern, dialogue, practice, lines]) => ({
  id, title, goal, pattern, dialogue, practice,
  phrases: lines.split('\n').map(line => line.split('|')),
}));
