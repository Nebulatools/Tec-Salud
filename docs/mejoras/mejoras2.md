Ayudame con los sifuienets cmabios:

1. ver por que el lgoo de zuly de lado de admin es diferetede laod de user!, necesitamos tener el mismo logo y del mismo tamaño, hagamoslo pequeño, sutil! como el del la vista del user.

2. cuando porgramo una cita nueva con un paciente en el la pagaind e http://localhost:3000/consultas, en el modal de nueva consulta, ya esta consultanto los users nuevos que fueron vinculados correcto?, pero cuando trato de consulatr ese paxcineet vinculaod en la pagina de http://localhost:3000/consultas/c006c328-6423-443a-84db-d6409ab85887, cuando grabo la consulta si aparece lo que dije pero aparece este error : Parse error 500
components/appointments/consultation-steps/consultation-recording.tsx (144:15) @ triggerParseAndPersist


  142 |       })
  143 |       if (!res.ok) {
> 144 |         throw new Error(`Parse error ${res.status}`)
      |               ^
  145 |       }
  146 |       const parsed = await res.json()
  147 |

  y cuando le doy siguiente a asistenet de cumplimiento de AI: me aparece este error en un pop up: Error al analizar la transcripción: Failed to analyze compliance. Por favor, inténtalo de nuevo., quieor que analices  toda la pagainde la consukta: http://localhost:3000/consultas/c006c328-6423-443a-84db-d6409ab85887?step=2 y que realmente fucnionen todos los pasos para el paciente vnculado que tenemos, recuerda que esos paicnetes estaban en otra tabla en supabase, ahora ay cmabamos de users con esoos neuvos que fieron vincualdos!, usa el mcp de supabase para enetnder la estrctura de las tablas: ufdlwhdrrvktthcxwpzt, si no aqui tienes la cforma de conectrate: /Users/jaco/Desktop/proyectos/tec-salud/docs/supabase-connection.md primero antes que nada analiza la estrctra de las tablas de supabase, queior enetnder cuales son las tablas que estamos usando en este nuevo flujo de vista de pacientes y vista de admin!, recuerda que teniamos tabals anteriores por los paicnetes que el doctor creaba manualmenet, pero ahora ya la cosa cambió ya que el usuario y admin tienen diferenets vistas y se pueden vincular, correcto?, analiza todo a detalle, y despues de que analices, ya empiezas a realizaer los cambios, ESTTRCITAMNETE ANALIZA  BIEN LA CONFIGURACION DE SUPABASE ANTES DE HACER CAMBIOS!,
  