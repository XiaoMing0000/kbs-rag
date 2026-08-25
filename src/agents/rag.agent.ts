import { HumanMessage, createAgent } from 'langchain';
import { Model } from '../utils/models';
import { documentsTool, retrieveContextTool } from '../tools/rag.tool';
import z from 'zod';

const model = Model.deepseek();

const contextSchema = z.object({
  userId: z.string().describe('用户id'),
  userName: z.string().describe('用户名称'),
});

const ragAgent = createAgent({
  model,
  tools: [documentsTool, retrieveContextTool],
  systemPrompt: '你是一个知识库助手，请根据用户的问题，从知识库中检索相关内容，并返回给用户。',
  contextSchema,
});

export async function testAgent(userId: string, userName: string): Promise<string> {
  const configurable = {
    maxSteps: 10,
    verbose: true,
  };
  const response = await ragAgent.invoke(
    {
      messages: [new HumanMessage('你好，我是xiaoming0000，rag的流程是什么？')],
    },
    {
      // 生产环境使用通过 session 管理用户信息
      context: {
        userId,
        userName,
      },
      configurable,
    },
  );
  // console.log(response.messages.at(-1)?.content);
  return (response.messages.at(-1)?.content as string) ?? '';
}
