import { getAlias, getIcon, getLobbyUsers } from "./users/index.js";
import { handleMediaGroup } from "./relay/mediaGroup.js";
import { relayStandardMessage } from "./relay/standardMessage.js";

export async function relayMessage(ctx) {
  const senderId = ctx.from.id;
  const senderAlias = await getAlias(senderId);
  const senderIcon = await getIcon(senderId);
  const recipients = (await getLobbyUsers()).filter(
    (uid) => uid !== String(senderId)
  );

  if (!recipients.length) return;

  if (ctx.message.media_group_id) {
    return handleMediaGroup(ctx, senderId, senderAlias, senderIcon, recipients);
  }

  return relayStandardMessage(
    ctx,
    senderId,
    senderAlias,
    senderIcon,
    recipients
  );
}
