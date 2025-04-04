import { useState } from 'react'
import { TriggerMode } from '../config'
import ChatGPTCard from './ChatGPTCard'
import { QueryStatus } from './ChatGPTQuery'

interface Props {
  question: string
  triggerMode: TriggerMode
}

function ChatGPTContainer(props: Props) {
  const [queryStatus, setQueryStatus] = useState<QueryStatus>()

  return (
    <div className="chat-gpt-wrapper" style={{ width: '100%', display: 'block' }}>
      <div className="chat-gpt-card" style={{ width: '100%' }}>
        <ChatGPTCard
          question={props.question}
          triggerMode={props.triggerMode}
          onStatusChange={setQueryStatus}
        />
      </div>
    </div>
  )
}

export default ChatGPTContainer
