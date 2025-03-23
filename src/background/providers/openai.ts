import { fetchSSE } from '../fetch-sse'
import { GenerateAnswerParams, Provider } from '../types'

export class OpenAIProvider implements Provider {
  constructor(private token: string, private model: string, private apiBaseUrl?: string) {
    this.token = token
    this.model = model
    this.apiBaseUrl = apiBaseUrl || 'https://api.openai.com'
  }

  private buildMessages(prompt: string): Array<{ role: string; content: string }> {
    return [
      { role: 'developer', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt },
    ]
  }

  async generateAnswer(params: GenerateAnswerParams) {
    let result = ''
    let messageId = ''
    await fetchSSE(`${this.apiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      signal: params.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.buildMessages(params.prompt),
        stream: true,
      }),
      onMessage(message) {
        console.debug('sse message', message)
        if (message === '[DONE]') {
          params.onEvent({ type: 'done' })
          return
        }
        let data
        try {
          data = JSON.parse(message)
          if (!messageId && data.id) {
            messageId = data.id
          }

          if (data.choices && data.choices.length > 0) {
            const { delta, finish_reason } = data.choices[0]

            if (finish_reason === 'stop') {
              params.onEvent({ type: 'done' })
              return
            }

            const content = delta?.content || ''
            if (content) {
              result += content
              params.onEvent({
                type: 'answer',
                data: {
                  text: result,
                  messageId: messageId,
                  conversationId: messageId,
                },
              })
            }
          }
        } catch (err) {
          console.error(err)
          return
        }
      },
    })
    return {}
  }
}
