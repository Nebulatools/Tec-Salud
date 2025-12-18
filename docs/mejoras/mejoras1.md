Ayduame a implementar estos cambios:

antes de cualqueir cosa, necesito que te coenctes a la base de datos de supabase, tienes forma de conectarte sin porbelma: /Users/jaco/Desktop/proyectos/tec-salud/docs/supabase-connection.md

una evz que tegas contexto de todo de la estructura de las tablas y bases de datos ayudame con los siguinetes cambios

1. en la pagiana de: https://localhost:3000.app/user/perfil, ayudame en el cuestionario basico: agregar género, ⁠agregar fecha de nacimiento, ⁠calcular porcentil de peso y estatua con respecto a edad y género, cambiar nombre de sección alergias conocidas a “alergias”, ⁠al typear otra alergia no hay botón para agregar y al dar enter me saco a home page, n deberia de redirijirme a home page, soloque se guarde. , agregar sección historia clínica familiar, en Medicamentos Actuales cambair el nombrre del placeholder por "compuesto"

en la seccion de condiciones cronicas vamos a modificr tantito el cuestioanriio para que tengamos los antecedneets familairias y personales, aqui te dejo la ifno: 

ANTECEDENTES FAMILIARES
Condición,Opciones,Condición,Opciones
1 - HIPERTENSIÓN,SI / NO / NO SABE,4 - HEPATOPATÍAS,SI / NO / NO SABE
2 - DIABETES,SI / NO / NO SABE,5 - TUMORES,SI / NO / NO SABE
3 - CARDIOPATÍAS,SI / NO / NO SABE,6 - MENTALES,SI / NO / NO SABE

Antecddentes PERSONALES:
Condición,Opciones,Condición,Opciones
1 - HIPERTENSIÓN,SI / NO / NO SABE,9 - MENTALES,SI / NO / NO SABE
2 - DIABETES,SI / NO / NO SABE,10 - INFECCIÓN PÉLVICA,SI / NO / NO SABE
3 - CARDIOPATÍAS,SI / NO / NO SABE,11 - INFECCIÓN CERVICAL,SI / NO / NO SABE
4 - HEPATOPATÍAS,SI / NO / NO SABE,12 - FLUJO VAGINAL,SI / NO / NO SABE
5 - NEFRITIS,SI / NO / NO SABE,13 - CIRUGÍA GINECOLÓGICA,SI / NO / NO SABE
6 - TUMORES,SI / NO / NO SABE,14 - OTROS,SI / NO / NO SABE
7 - TROMBOFLEBITIS,SI / NO / NO SABE,15 - RESULTADO CITOLOGÍA,
8 - FUMA,SI / NO / NO SABE,FECHA:,DÍA / MES / AÑO
CUANTOS DIARIOS,__________,,


"ojo": estas opciones de 2 - DIABETES	SI / NO / NO SABE	10 - INFECCIÓN PÉLVICA	SI / NO / NO SABE
3 - CARDIOPATÍAS	SI / NO / NO SABE	11 - INFECCIÓN CERVICAL	SI / NO / NO SABE
4 - HEPATOPATÍAS	SI / NO / NO SABE	12 - FLUJO VAGINAL	SI / NO / NO SABE
5 - NEFRITIS	SI / NO / NO SABE	13 - CIRUGÍA GINECOLÓGICA	SI / NO / NO SABE, deberian aparecr solo si el genero es mujer

En la seccion de cirugias /hospitalizaciones deberia de poder permitir agregar mas cirugias en caso de haber mas.

2. En la seccion de user/especialistas, en ve< de que diga "llenar cuestioanrio" que diga "solicitar cita" y cuando por primera vez quiere llenar ese cuestioanrio de especialziacion que mejor deje llenar el cuestioanrio de especialziacion son antes estar vinculaod, ya la solciitude vinculacion que aparezca cuando complete el cuestionario de especizalicion!, ok?

Una vez vinculado el usuario user con admin, el admin deberia de oder ver esos expedienets en lña seccion de expedientes /expedientes, yo se que tenemos codifo que esta ligado a otras tablas!, quieor que todo ese codfio me lo reeplazes o quites y  que me pongas mejor los expedienets medicos que el user lleno, tanto el cuesrtioanrio basico, como el de espcializacion! ok?, hay codifo en la seccion de expedinetes que no esta ligado con la seccion de especialziastas, queiro que me quites ese codifo que tenemos en expedienets y me reemplazes por lo que aparece en especiliasta y ahi me pomgas los expedienets de los users!, ok?, o si se te hace mas facil que me borres la seccion de /expedienets con todo o relacionaod a eso con su atbals de supabse, y que mejor la seccion de especialistas me lo cmabies. aexpedientes y qwu ahi me pongas los expedienets de los pacineets compo ya los tenemos,  lo dejo a tu creiterio!, 

3. Agregar de lado de /admin en el sidebar una seccion que se llame perfil, que ahi el admn pueda llenar su perfil de especialista, ahi pueda agregar foto, para que aparezca en el card, que úeda poner papers, gardos de estudios, links, etc!, y por supiuesto la especilidad, ahrita tenemso tres correcto: cadio, endo, y medicna interna, vdd, en vez de ponerlo en el /especialistas en dodne dice : Configura tu especialidad.


4. Ayudme a que la pagian de /consultas  cuando le dly ueva consulta, cuandoq ueiro seleccionar el pacinete este ligado conn los apcienets que tenemos dados de alta cuando se hizo la vincualcion del pacienets - doctor, ok?, para que haya relacion de esa pagain ya para hacer consultas.



5. ayudame a reusar codifo, creo que tenemso codifo disntitnto en la seccion de la vista del user y del doctor, por que el sidebar essta diferenets, me doy cuenta por el logo esta diferenet, queiro asumir que son codifos disntitnos en los dos diferentes vistas, queior que reusar y ser dry y efcinete con el codifo, y depeiendo si es user o admin le apareczana. ada uno sus secciones en el sidebar que les corresponde!.


6. en vez de que diga : Continuar a Laboratorios que diga continuar es todo.


