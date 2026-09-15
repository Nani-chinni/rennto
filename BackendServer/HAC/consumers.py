import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_phone = self.scope['url_route']['kwargs'].get('user_phone')
        self.admin_group = "admin_notifications"
        self.public_group = "public_updates"
        
        # Join admin and public groups
        await self.channel_layer.group_add(self.admin_group, self.channel_name)
        await self.channel_layer.group_add(self.public_group, self.channel_name)
        
        # Join personalized group if phone is provided
        if self.user_phone:
            sanitized_phone = str(self.user_phone).replace("+", "").replace("@", "_").replace(".", "_")
            self.personal_group = f"user_notifications_{sanitized_phone}"
            self.notif_group = f"notifications_{sanitized_phone}"
            await self.channel_layer.group_add(self.personal_group, self.channel_name)
            await self.channel_layer.group_add(self.notif_group, self.channel_name)

            # If user_phone is an owner identifier, also listen on the companion ID (owner_id <-> phone)
            self.extra_groups = []
            try:
                from HAC.services.common_service import CommonService
                owner = CommonService.get_owner(self.user_phone)
                if owner:
                    for other_id in [owner.owner_id, owner.phone]:
                        if other_id and str(other_id) != str(self.user_phone):
                            s_other = str(other_id).replace("+", "").replace("@", "_").replace(".", "_")
                            g1 = f"user_notifications_{s_other}"
                            g2 = f"notifications_{s_other}"
                            await self.channel_layer.group_add(g1, self.channel_name)
                            await self.channel_layer.group_add(g2, self.channel_name)
                            self.extra_groups.extend([g1, g2])
            except Exception:
                pass
        else:
            self.personal_group = None
            self.notif_group = None
            self.extra_groups = []

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.admin_group, self.channel_name)
        await self.channel_layer.group_discard(self.public_group, self.channel_name)
        if hasattr(self, 'personal_group') and self.personal_group:
            await self.channel_layer.group_discard(self.personal_group, self.channel_name)
        if hasattr(self, 'notif_group') and self.notif_group:
            await self.channel_layer.group_discard(self.notif_group, self.channel_name)
        if hasattr(self, 'extra_groups') and self.extra_groups:
            for g in self.extra_groups:
                await self.channel_layer.group_discard(g, self.channel_name)

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event["content"]))

    async def status_update(self, event):
        await self.send(text_data=json.dumps(event["content"]))

class OwnerStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.phone = self.scope['url_route']['kwargs'].get('phone')
        if not self.phone:
            await self.close()
            return

        # Sanitize phone for group name (alphanumeric and underscores only)
        sanitized_phone = str(self.phone).replace("+", "").replace("@", "_").replace(".", "_")
        self.group_name = f"owner_status_{sanitized_phone}"

        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Receive message from room group
    async def status_update(self, event):
        # Send message to WebSocket
        # Message format: {"type": "status_update", "status": "active", "reason": "..."}
        await self.send(text_data=json.dumps(event["content"]))

 
class TenantNotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Accept phone number as the identifier (used as the tenant primary key)
        self.phone = self.scope['url_route']['kwargs'].get('phone') or self.scope['url_route']['kwargs'].get('tenant_id')
        if not self.phone:
            await self.close()
            return
        sanitized_phone = self.phone.replace("+", "").replace("@", "_").replace(".", "_")
        self.tenant_group = f"tenant_notifications_{sanitized_phone}"
        self.user_group = f"user_notifications_{sanitized_phone}"
        self.public_group = "public_updates"
        await self.channel_layer.group_add(self.tenant_group, self.channel_name)
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.channel_layer.group_add(self.public_group, self.channel_name)
        await self.accept()
 
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.tenant_group, self.channel_name)
        await self.channel_layer.group_discard(self.user_group, self.channel_name)
        await self.channel_layer.group_discard(self.public_group, self.channel_name)
 
    async def send_tenant_notification(self, event):
        await self.send(text_data=json.dumps(event["content"]))
 
    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event["content"]))
 
 
 