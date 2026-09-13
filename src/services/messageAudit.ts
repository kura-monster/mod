import type { Message, OmitPartialGroupDMChannel, PartialMessage } from 'discord.js';
import { logModerationAction } from './moderationLog.js';

function truncate(text: string, max = 500): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** メッセージ編集をログに残す(荒らしがNGワードを一時的に編集で回避する等の対策) */
export async function logMessageEdit(
  oldMessage: OmitPartialGroupDMChannel<Message | PartialMessage>,
  newMessage: OmitPartialGroupDMChannel<Message>,
): Promise<void> {
  if (!newMessage.guild || newMessage.author?.bot || newMessage.webhookId) return;
  if (oldMessage.content === newMessage.content) return;

  await logModerationAction({
    guild: newMessage.guild,
    action: 'MESSAGE_EDITED',
    moderator: newMessage.client.user!,
    target: newMessage.author ?? undefined,
    reason: `${newMessage.channel}でメッセージが編集されました`,
    extra: {
      編集前: oldMessage.content ? truncate(oldMessage.content) : '(キャッシュされていません)',
      編集後: newMessage.content ? truncate(newMessage.content) : '(内容なし)',
    },
  });
}

/** メッセージ削除をログに残す(荒らしが投稿してすぐ削除する行為の追跡用) */
export async function logMessageDelete(message: OmitPartialGroupDMChannel<Message | PartialMessage>): Promise<void> {
  if (!message.guild || message.author?.bot || message.webhookId) return;

  await logModerationAction({
    guild: message.guild,
    action: 'MESSAGE_DELETED',
    moderator: message.client.user!,
    target: message.author ?? undefined,
    reason: `${message.channel}でメッセージが削除されました`,
    extra: {
      内容: message.content ? truncate(message.content) : '(キャッシュされていないメッセージ)',
    },
  });
}
