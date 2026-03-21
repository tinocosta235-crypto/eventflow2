import type { NodeTypes } from "@xyflow/react"
import { TriggerNode }    from "./TriggerNode"
import { EmailNode }      from "./EmailNode"
import { FormNode }       from "./FormNode"
import { ConditionNode }  from "./ConditionNode"
import { WaitNode }       from "./WaitNode"
import { ManualNode }     from "./ManualNode"
import { MasterlistNode } from "./MasterlistNode"
import { AgentNode }      from "./AgentNode"
import { EndNode }        from "./EndNode"

export { TriggerNode }    from "./TriggerNode"
export { EmailNode }      from "./EmailNode"
export { FormNode }       from "./FormNode"
export { ConditionNode }  from "./ConditionNode"
export { WaitNode }       from "./WaitNode"
export { ManualNode }     from "./ManualNode"
export { MasterlistNode } from "./MasterlistNode"
export { AgentNode }      from "./AgentNode"
export { EndNode }        from "./EndNode"

export const nodeTypes: NodeTypes = {
  trigger:    TriggerNode,
  email:      EmailNode,
  form:       FormNode,
  condition:  ConditionNode,
  wait:       WaitNode,
  manual:     ManualNode,
  masterlist: MasterlistNode,
  agent:      AgentNode,
  end:        EndNode,
}
