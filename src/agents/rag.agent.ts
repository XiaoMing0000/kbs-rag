import { HumanMessage, createAgent } from 'langchain';
import { Model } from '../utils/models';
import { documentsTool, retrieveContextTool } from '../tools/rag.tool';

const model = Model.deepseek();

const ragAgent = createAgent({
  model,
  tools: [documentsTool, retrieveContextTool],
  systemPrompt: '你是一个知识库助手，请根据用户的问题，从知识库中检索相关内容，并返回给用户。',
});

export async function testAgent() {
  const response = await ragAgent.invoke({
    messages: [new HumanMessage('你好，我是xiaoming0000，rag的流程是什么？')],
  });
  console.log(response.messages.at(-1)?.content);
}
