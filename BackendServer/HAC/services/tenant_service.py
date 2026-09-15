from django.conf import settings
from django.db import transaction
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from HAC.models import Tenent, Owners, TenantBeds, ApartmentTenantBeds, CommercialTenantBeds, BlockedTenant, JoinRequest, ExistingTenantRequest, TenantNotification, StayHostelDetails, ApartmentStayDetails, CommericialDetails
from HAC.serializers import TenentSerializer
from .common_service import CommonService
from .notification_service import NotificationService

class TenantService:

    @staticmethod
    def get_tenant_details(phone, request=None):
        tenant = CommonService.get_tenant(phone)
        if not tenant:
            raise Exception("Tenant not found")
 
        # PROFILE IMAGE
        image_url = None
        if getattr(tenant, 'selfie', None):
            if request:
                image_url = request.build_absolute_uri(tenant.selfie.url)
            else:
                image_url = tenant.selfie.url
 
        # PROPERTY DETAILS
        property_name = "N/A"
        property_type = "N/A"
        location = "N/A"
        property_image = None

        def get_prop_img(obj):
            if not obj:
                return None
            if getattr(obj, 'cover_image', None):
                try:
                    url = obj.cover_image.url
                    if url:
                        return request.build_absolute_uri(url) if request else url
                except Exception:
                    pass
            gallery = getattr(obj, 'gallery_images', None)
            if gallery and isinstance(gallery, list) and len(gallery) > 0:
                first_img = gallery[0]
                if isinstance(first_img, str) and first_img.strip():
                    if first_img.startswith('http://') or first_img.startswith('https://'):
                        return first_img
                    if first_img.startswith('/media/'):
                        clean_path = first_img
                    elif first_img.startswith('media/'):
                        clean_path = f'/{first_img}'
                    else:
                        clean_path = f"{getattr(settings, 'MEDIA_URL', '/media/')}{first_img.lstrip('/')}"
                    return request.build_absolute_uri(clean_path) if request else clean_path
            return None

        # ── RESOLVE JOINED PROPERTY & BED DETAILS ──
        latest_jr = JoinRequest.objects.filter(tenant=tenant).order_by('-created_at').first()
        latest_ex_req = ExistingTenantRequest.objects.filter(tenant=tenant).order_by('-created_at').first()

        effective_owner = tenant.owner
        if not effective_owner:
            if latest_jr and latest_jr.owner:
                effective_owner = latest_jr.owner
            elif latest_ex_req and latest_ex_req.owner:
                effective_owner = latest_ex_req.owner

        if effective_owner:
            target_prop_name = (latest_jr.property_name if latest_jr and latest_jr.property_name else (latest_ex_req.property_name if latest_ex_req and latest_ex_req.property_name else "")).strip()
            property_found = False

            if target_prop_name:
                hostel = StayHostelDetails.objects.filter(owner=effective_owner, hostelName__iexact=target_prop_name).first()
                if hostel:
                    property_name = hostel.hostelName
                    property_type = hostel.stayType
                    location = hostel.location
                    property_image = get_prop_img(hostel)
                    property_found = True
                else:
                    apt = ApartmentStayDetails.objects.filter(owner=effective_owner, apartmentName__iexact=target_prop_name).first()
                    if apt:
                        property_name = apt.apartmentName
                        property_type = apt.stayType
                        location = apt.location
                        property_image = get_prop_img(apt)
                        property_found = True
                    else:
                        comm = CommericialDetails.objects.filter(owner=effective_owner, commercialName__iexact=target_prop_name).first()
                        if comm:
                            property_name = comm.commercialName
                            property_type = comm.stayType
                            location = comm.location
                            property_image = get_prop_img(comm)
                            property_found = True

            if not property_found:
                hostel = StayHostelDetails.objects.filter(owner=effective_owner).first()
                if hostel:
                    property_name = hostel.hostelName
                    property_type = hostel.stayType
                    location = hostel.location
                    property_image = get_prop_img(hostel)
                else:
                    apartment = ApartmentStayDetails.objects.filter(owner=effective_owner).first()
                    if apartment:
                        property_name = apartment.apartmentName
                        property_type = apartment.stayType
                        location = apartment.location
                        property_image = get_prop_img(apartment)
                    else:
                        commercial = CommericialDetails.objects.filter(owner=effective_owner).first()
                        if commercial:
                            property_name = commercial.commercialName
                            property_type = commercial.stayType
                            location = commercial.location
                            property_image = get_prop_img(commercial)

        # ROOM / FLOOR DETAILS
        room_no = "N/A"
        floor_no = "N/A"
        check_in = "N/A"
        rent = "N/A"

        has_allocation = False
        hostel_bed = TenantBeds.objects.filter(phone__iexact=tenant.phone).first()
        if hostel_bed:
            has_allocation = True
            room_no = hostel_bed.roomno
            floor_no = hostel_bed.floor
            check_in = str(hostel_bed.checkIn) if hostel_bed.checkIn else "N/A"
            rent = str(hostel_bed.rent)
        else:
            apt_bed = ApartmentTenantBeds.objects.filter(phone__iexact=tenant.phone).first()
            if apt_bed:
                has_allocation = True
                room_no = apt_bed.flatno
                floor_no = apt_bed.floor
                check_in = str(apt_bed.checkIn) if apt_bed.checkIn else "N/A"
                rent = str(apt_bed.rent)
            else:
                comm_bed = CommercialTenantBeds.objects.filter(phone__iexact=tenant.phone).first()
                if comm_bed:
                    has_allocation = True
                    room_no = comm_bed.sectionNo
                    floor_no = comm_bed.floor
                    check_in = str(comm_bed.checkIn) if comm_bed.checkIn else "N/A"
                    rent = str(comm_bed.rent)

        if room_no == "N/A":
            if latest_jr:
                room_no = latest_jr.sharing or latest_jr.flat or latest_jr.section or "N/A"
                floor_no = latest_jr.requested_floor or "1"
                check_in = str(latest_jr.check_in) if latest_jr.check_in else (str(latest_jr.created_at.date()) if latest_jr.created_at else "N/A")
            elif latest_ex_req:
                room_no = latest_ex_req.requested_room or latest_ex_req.requested_flat or "N/A"
                floor_no = latest_ex_req.requested_floor or "1"

        aadhar_back_url = None
        payment_screenshot_url = None
        selfie_url = None

        if getattr(tenant, 'aadhar_back_image', None):
            if request:
                aadhar_back_url = request.build_absolute_uri(tenant.aadhar_back_image.url)
            else:
                aadhar_back_url = tenant.aadhar_back_image.url
        if getattr(tenant, 'payment_screenshot', None):
            if request:
                payment_screenshot_url = request.build_absolute_uri(tenant.payment_screenshot.url)
            else:
                payment_screenshot_url = tenant.payment_screenshot.url
        if getattr(tenant, 'selfie', None):
            if request:
                selfie_url = request.build_absolute_uri(tenant.selfie.url)
            else:
                selfie_url = tenant.selfie.url

        # ── STATUS DETERMINATION ──
        # A tenant is only joined once THEY have confirmed - shared their
        # Aadhaar details through Join Now, which moves the request to
        # 'joined'/'completed'. Sending a join request sets tenant.owner (see
        # RequestService.send_join_request) and the owner allotting a bed moves
        # it to 'allotted'/'pending_confirmation'; neither means the tenant has
        # joined, and treating them as "Active" unlocked Issues, Payments and
        # the property cover image before the tenant ever filled anything in.
        jr_status = (latest_jr.status if latest_jr else "") or ""
        ex_status = (latest_ex_req.status if latest_ex_req else "") or ""

        confirmed_request = (
            jr_status in ['joined', 'completed', 'active']
            or ex_status in ['joined', 'completed']
        )
        # Awaiting the tenant's own confirmation: the owner has allotted a unit
        # but the tenant has not gone through Join Now yet. This outranks the
        # allocation row below, because allotting already creates one.
        awaiting_confirmation = (
            not confirmed_request
            and (jr_status in ['accepted', 'allotted', 'pending_confirmation']
                 or ex_status in ['accepted', 'allotted'])
        )
        # A tenant the owner added directly holds a unit with no request of any
        # kind behind it - they are in, and must not be locked out here.
        owner_added = has_allocation and not awaiting_confirmation and not tenant.is_vacant

        has_joined = confirmed_request or owner_added

        if has_joined:
            final_status = "Active"
        elif awaiting_confirmation:
            final_status = "Awaiting Confirmation"
        elif jr_status == 'pending' or ex_status == 'pending':
            final_status = "Pending Join"
        else:
            final_status = "Vacant"

        # ── DUE DATE CALCULATION ──
        due_date_str = "N/A"
        next_due_date_str = "N/A"
        try:
            from HAC.models import Payment
            import datetime, calendar
            last_payment = Payment.objects.filter(tenant_phone__iexact=tenant.phone).order_by('-created_at').first()
            success_count = Payment.objects.filter(tenant_phone__iexact=tenant.phone, status='SUCCESS').count()

            check_in_date_obj = None
            if check_in and check_in != "N/A":
                if isinstance(check_in, str):
                    clean_str = check_in.split('T')[0]
                    check_in_date_obj = datetime.datetime.strptime(clean_str, '%Y-%m-%d').date()
                elif hasattr(check_in, 'date'):
                    check_in_date_obj = check_in.date()
                elif isinstance(check_in, datetime.date):
                    check_in_date_obj = check_in

            if check_in_date_obj:
                month = check_in_date_obj.month - 1 + success_count + 1
                year = check_in_date_obj.year + month // 12
                month = month % 12 + 1
                day = min(check_in_date_obj.day, calendar.monthrange(year, month)[1])
                n_date = datetime.date(year, month, day)
                due_date_str = n_date.strftime('%Y-%m-%d')
                next_due_date_str = due_date_str

            if last_payment and getattr(last_payment, 'next_due_date', None):
                next_due_date_str = last_payment.next_due_date.strftime('%Y-%m-%d')
                due_date_str = next_due_date_str
        except Exception as e:
            print("Error calculating due date for tenant:", e)

        return {
            "id": tenant.id,
            "name": tenant.name,
            "phone": tenant.phone,
            "gender": getattr(tenant, "gender", "N/A"),
            "identityType": getattr(tenant, "identityType", "N/A"),
            "identityImage": image_url,
            "aadhar_id": getattr(tenant, "aadhar_id", "N/A"),
            "aadhar_image": image_url,
            "aadhar_back_image": aadhar_back_url,
            "payment_screenshot": payment_screenshot_url,
            "selfie": selfie_url,

            # PROPERTY
            "property_name": property_name,
            "property_type": property_type,
            "location": location,
            "property_image": property_image,

            # OWNER - the tenant app needs an owner identifier to address
            # requests (accommodation change, etc.) to the right owner.
            "owner_id": effective_owner.owner_id if effective_owner else None,
            "owner_phone": effective_owner.phone if effective_owner else None,

            # ROOM & STAY DATES
            "room_number": room_no,
            "floor_number": floor_no,
            "check_in": check_in,
            "checkIn": check_in,
            "due_date": due_date_str,
            "dueDate": due_date_str,
            "next_due_date": next_due_date_str,
            "rent": rent,

            "status": final_status,
            # Explicit flags so the app does not have to interpret the status
            # string to decide what a tenant may open.
            "has_joined": has_joined,
            "awaiting_confirmation": awaiting_confirmation,
        }

    @staticmethod
    def tenant_profile_update(phone, data, files=None):
        tenant = Tenent.objects.filter(phone=phone).first()
        if not tenant:
            raise Exception("Tenant not found")
 
        tenant.name = data.get('name', tenant.name)
        tenant.phone = data.get('phone', tenant.phone)
        
        img_file = data.get('tenant_img_field') or (files and files.get('tenant_img_field'))
        if img_file:
            tenant.selfie = img_file
            
        tenant.save()
        return {"message": "Profile updated successfully"}

    @staticmethod
    def get_tenant_by_phone(phone, request=None):
        tenant = Tenent.objects.filter(phone=phone).first()
        if not tenant:
            raise Exception("Tenant not found")
 
        image_url = None
        if getattr(tenant, 'selfie', None):
            if request:
                image_url = request.build_absolute_uri(tenant.selfie.url)
            else:
                image_url = tenant.selfie.url
 
        return {
            "id": tenant.id,
            "name": tenant.name,
            "phone": tenant.phone,
            "gender": getattr(tenant, "gender", "N/A"),
            "identityType": getattr(tenant, "identityType", "N/A"),
            "identityImage": image_url,
        }

    @staticmethod
    def update_status(data):
        tenant_phone = data.get("tenant_phone")
        owner_phone = data.get("owner_phone")
        status_value = data.get("status")

        tenant = Tenent.objects.filter(
            phone=tenant_phone,
            owner__owner_id=owner_phone
        ).first()
        
        if not tenant:
            # Try alternate key check if matching models exactly
            tenant = Tenent.objects.filter(
                phone=tenant_phone
            ).first()
            
        if not tenant:
            raise Exception("Request not found")
            
        tenant.status = status_value
        tenant.save()
        return {"message": "Status updated"}

    @staticmethod
    def get_owner_tenants(phone):
        owner = CommonService.get_owner(phone)
        if not owner:
            raise Exception("Owner not found")
 
        tenants_list = []
       
        # 1. Hostel Tenants
        hostel_tenants = TenantBeds.objects.filter(Q(owner=owner) | Q(owner_phone=owner.owner_id))
        for t in hostel_tenants:
            tenants_list.append({
                "id": t.id,
                "name": t.name,
                "phone": t.phone,
                "room": f"Room {t.roomno}",
                "property_type": "Hostel",
                "rent": t.rent,
                "checkIn": t.checkIn
            })
           
        # 2. Apartment Tenants
        apartment_tenants = ApartmentTenantBeds.objects.filter(Q(owner=owner) | Q(owner_phone=owner.owner_id))
        for t in apartment_tenants:
            tenants_list.append({
                "id": t.id,
                "name": t.name,
                "phone": t.phone,
                "room": f"Flat {t.flatno}",
                "property_type": "Apartment",
                "rent": t.rent,
                "checkIn": t.checkIn
            })
           
        # 3. Commercial Tenants
        commercial_tenants = CommercialTenantBeds.objects.filter(Q(owner=owner) | Q(owner_phone=owner.owner_id))
        for t in commercial_tenants:
            tenants_list.append({
                "id": t.id,
                "name": t.name,
                "phone": t.phone,
                "room": f"Section {t.sectionNo}",
                "property_type": "Commercial",
                "rent": t.rent,
                "checkIn": t.checkIn
            })
           
        return tenants_list
 
    @staticmethod
    def get_co_residents(phone):
        tenant = CommonService.get_tenant(phone)
        if not tenant or not tenant.owner:
            return []
           
        owner = tenant.owner
        co_residents = []
       
        hostel_beds = TenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in hostel_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Room {t.roomno}",
                "property_type": "Hostel", "rent": t.rent, "checkIn": t.checkIn
            })
           
        apt_beds = ApartmentTenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in apt_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Flat {t.flatno}",
                "property_type": "Apartment", "rent": t.rent, "checkIn": t.checkIn
            })
           
        comm_beds = CommercialTenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in comm_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Section {t.sectionNo}",
                "property_type": "Commercial", "rent": t.rent, "checkIn": t.checkIn
            })
           
        return co_residents

    @staticmethod
    def get_co_residents(phone):
        tenant = CommonService.get_tenant(phone)
        if not tenant or not tenant.owner:
            return []
            
        owner = tenant.owner
        co_residents = []
        
        hostel_beds = TenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in hostel_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Room {t.roomno}",
                "property_type": "Hostel", "rent": t.rent, "checkIn": t.checkIn
            })
            
        apt_beds = ApartmentTenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in apt_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Flat {t.flatno}",
                "property_type": "Apartment", "rent": t.rent, "checkIn": t.checkIn
            })
            
        comm_beds = CommercialTenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in comm_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Section {t.sectionNo}",
                "property_type": "Commercial", "rent": t.rent, "checkIn": t.checkIn
            })
            
        return co_residents

    @staticmethod
    @transaction.atomic
    def tenant_submit_verification(data, files):
        phone = data.get("phone")
        aadhar_id = data.get("aadhar_id")
        aadhar_image = files.get("aadhar_image")
        aadhar_back_image = files.get("aadhar_back_image")
        payment_screenshot = files.get("payment_screenshot")
        selfie = files.get("selfie")

        if not phone or not aadhar_id or not aadhar_image:
            raise ValueError("Aadhaar ID and Aadhaar Front image are required.")

        aadhar_id = aadhar_id.strip()
        if not aadhar_id.isdigit() or len(aadhar_id) != 12:
            raise ValueError("Aadhar ID must be exactly 12 numeric digits.")

        existing_tenant = Tenent.objects.filter(aadhar_id=aadhar_id).exclude(phone=phone).first()
        if existing_tenant:
            raise ValueError("This Aadhar ID is already registered to another user.")

        tenant = CommonService.get_tenant(phone)
        if not tenant:
            raise Exception("Tenant not found.")

        # ── Save documents on tenant ──
        tenant.aadhar_id = aadhar_id
        tenant.aadhar_image = aadhar_image
        if aadhar_back_image:
            tenant.aadhar_back_image = aadhar_back_image
        if payment_screenshot:
            tenant.payment_screenshot = payment_screenshot
        if selfie:
            tenant.selfie = selfie

        # ── Find the pending_confirmation JoinRequest (or fall back to allotted/accepted) ──
        join_req = JoinRequest.objects.filter(
            tenant=tenant,
            status__in=['pending_confirmation', 'allotted', 'accepted']
        ).order_by('-created_at').first()

        # ── Create TenantBeds from allotment data stored on JoinRequest ──
        if join_req and join_req.allotted_rent is not None:
            property_type = (join_req.property_type or '').lower()
            owner_phone = join_req.allotted_owner_phone or (
                join_req.owner.owner_id if join_req.owner else ''
            )
            check_in = join_req.allotted_check_in
            check_out = join_req.allotted_check_out
            rent = join_req.allotted_rent or 0

            if property_type == 'hostel':
                if not TenantBeds.objects.filter(phone=phone).exists():
                    TenantBeds.objects.create(
                        owner=join_req.owner,
                        owner_phone=owner_phone,
                        name=tenant.name,
                        phone=tenant.phone,
                        bed=join_req.allotted_bed or 1,
                        floor=join_req.allotted_floor,
                        roomno=join_req.allotted_roomno,
                        rent=rent,
                        checkIn=check_in,
                        checkOut=check_out,
                    )
            elif property_type == 'apartment':
                if not ApartmentTenantBeds.objects.filter(phone=phone).exists():
                    ApartmentTenantBeds.objects.create(
                        owner=join_req.owner,
                        owner_phone=owner_phone,
                        name=tenant.name,
                        phone=tenant.phone,
                        floor=join_req.allotted_floor,
                        flatno=join_req.allotted_flatno,
                        rent=rent,
                        checkIn=check_in,
                        checkOut=check_out,
                    )
            elif property_type == 'commercial':
                if not CommercialTenantBeds.objects.filter(phone=phone).exists():
                    CommercialTenantBeds.objects.create(
                        owner=join_req.owner,
                        owner_phone=owner_phone,
                        name=tenant.name,
                        phone=tenant.phone,
                        floor=join_req.allotted_floor,
                        sectionNo=join_req.allotted_sectionno,
                        rent=rent,
                        checkIn=check_in,
                        checkOut=check_out,
                    )

        # ── Activate tenant ONLY when there is a valid allotted/accepted request ──
        # A plain 'pending' request means the owner has not yet reviewed it —
        # do NOT mark the tenant as active until the owner has explicitly accepted.
        if join_req:
            tenant.is_vacant = False
            if join_req.owner:
                tenant.owner = join_req.owner
            tenant.save()

            # ── Transition JoinRequest to 'joined' ──
            join_req.status = 'joined'
            join_req.save()
        else:
            # No accepted/allotted request — still save document fields but don't activate
            tenant.save()

        return {"message": "Verification submitted successfully!"}

    @staticmethod
    @transaction.atomic
    def block_tenant(data):
        tenant_phone = data.get('tenant_phone')
        owner_phone = data.get('owner_phone')
        reason = data.get('reason', 'Blocked by owner')

        if not tenant_phone or not owner_phone:
            raise ValueError("tenant_phone and owner_phone are required")

        owner = CommonService.get_owner(owner_phone)
        if not owner:
            raise Exception("Owner not found")

        tenant = CommonService.get_tenant(tenant_phone)
        if not tenant:
            raise Exception("Tenant not found")

        blocked_tenant, created = BlockedTenant.objects.get_or_create(
            owner=owner, tenant=tenant, defaults={'reason': reason, 'is_active': True}
        )
        if not created:
            blocked_tenant.is_active = True
            blocked_tenant.reason = reason
            blocked_tenant.save()

        tenant.is_vacant = True
        tenant.owner = None
        tenant.save()

        TenantBeds.objects.filter(owner_phone=owner_phone, phone=tenant_phone).delete()
        ApartmentTenantBeds.objects.filter(owner_phone=owner_phone, phone=tenant_phone).delete()
        CommercialTenantBeds.objects.filter(owner_phone=owner_phone, phone=tenant_phone).delete()
        JoinRequest.objects.filter(owner=owner, tenant=tenant).delete()

        # ── Persist a visible notification in the DB ──
        try:
            TenantNotification.objects.create(
                tenant_phone=tenant.phone,
                title="Removed from Property ⚠️",
                message="The owner has removed you from the property. Please contact the owner for more information.",
            )
        except Exception:
            pass

        # ── Notify the tenant via push + WebSocket ──
        try:
            if getattr(tenant, 'push_token', None):
                NotificationService.send_push_notification(
                    tenant.push_token,
                    "Removed from Property ⚠️",
                    "The owner has removed you from the property. Please contact the owner for more information.",
                )
        except Exception:
            pass

        try:
            sanitized = (
                (tenant.phone or "")
                .replace("+", "")
                .replace("@", "_")
                .replace(".", "_")
                .replace(" ", "")
            )
            channel_layer = get_channel_layer()
            for group in [f"tenant_notifications_{sanitized}", f"user_notifications_{sanitized}"]:
                async_to_sync(channel_layer.group_send)(
                    group,
                    {
                        "type": "send_notification",
                        "content": {
                            "type": "tenant_removed",
                            "message": "You have been removed from the property by the owner.",
                            "status": "vacated",
                        },
                    },
                )
        except Exception:
            pass

        return {'message': 'Tenant blocked successfully'}

    @staticmethod
    def unblock_tenant(data):
        tenant_phone = data.get('tenant_phone')
        owner_phone = data.get('owner_phone')

        if not tenant_phone or not owner_phone:
            raise ValueError("tenant_phone and owner_phone are required")

        owner = CommonService.get_owner(owner_phone)
        if not owner:
            raise Exception("Owner not found")

        tenant = CommonService.get_tenant(tenant_phone)
        if not tenant:
            raise Exception("Tenant not found")

        blocked_tenant = BlockedTenant.objects.filter(owner=owner, tenant=tenant).first()
        if blocked_tenant:
            blocked_tenant.is_active = False
            blocked_tenant.save()
            return {'message': 'Tenant unblocked successfully'}
        
        raise Exception("Block record not found")

        tenant = Tenent.objects.filter(phone=phone).first()
        if not tenant:
            raise Exception("Tenant not found")
 
        # PROFILE IMAGE
        image_url = None
        if getattr(tenant, 'selfie', None):
            if request:
                image_url = request.build_absolute_uri(tenant.selfie.url)
            else:
                image_url = tenant.selfie.url
 
        # PROPERTY DETAILS
        property_name = "N/A"
        property_type = "N/A"
        location = "N/A"
        property_image = None
 
        if tenant.owner and not tenant.is_vacant:
            jr = JoinRequest.objects.filter(
                tenant=tenant,
                status__in=['completed', 'joined']
            ).order_by('-created_at').first()

            existing_jr = ExistingTenantRequest.objects.filter(
                tenant=tenant,
                status__in=['completed', 'joined']
            ).order_by('-created_at').first()

            latest_req = None
            if jr and existing_jr:
                latest_req = jr if jr.created_at > existing_jr.created_at else existing_jr
            else:
                latest_req = jr or existing_jr
            
            if not latest_req:
                any_jr = JoinRequest.objects.filter(tenant=tenant).order_by('-created_at').first()
                any_existing = ExistingTenantRequest.objects.filter(tenant=tenant).order_by('-created_at').first()
                if any_jr and any_existing:
                    latest_req = any_jr if any_jr.created_at > any_existing.created_at else any_existing
                else:
                    latest_req = any_jr or any_existing

            jr = latest_req
            
            property_found = False
            if jr and jr.property_name:
                # Search Hostel
                hostel = StayHostelDetails.objects.filter(owner=tenant.owner, hostelName__iexact=jr.property_name.strip()).first()
                if hostel:
                    property_name = hostel.hostelName
                    property_type = hostel.stayType
                    location = hostel.location
                    if hostel.cover_image:
                        if request:
                            property_image = request.build_absolute_uri(hostel.cover_image.url)
                        else:
                            property_image = hostel.cover_image.url
                    property_found = True
                else:
                    # Search Apartment
                    apt = ApartmentStayDetails.objects.filter(owner=tenant.owner, apartmentName__iexact=jr.property_name.strip()).first()
                    if apt:
                        property_name = apt.apartmentName
                        property_type = apt.stayType
                        location = apt.location
                        if apt.cover_image:
                            if request:
                                property_image = request.build_absolute_uri(apt.cover_image.url)
                            else:
                                property_image = apt.cover_image.url
                        property_found = True
                    else:
                        # Search Commercial
                        comm = CommericialDetails.objects.filter(owner=tenant.owner, commercialName__iexact=jr.property_name.strip()).first()
                        if comm:
                            property_name = comm.commercialName
                            property_type = comm.stayType
                            location = comm.location
                            if comm.cover_image:
                                if request:
                                    property_image = request.build_absolute_uri(comm.cover_image.url)
                                else:
                                    property_image = comm.cover_image.url
                            property_found = True

            if not property_found:
                hostel = StayHostelDetails.objects.filter(owner=tenant.owner).first()
                if hostel:
                    property_name = hostel.hostelName
                    property_type = hostel.stayType
                    location = hostel.location
                    if hostel.cover_image:
                        if request:
                            property_image = request.build_absolute_uri(hostel.cover_image.url)
                        else:
                            property_image = hostel.cover_image.url
                else:
                    apartment = ApartmentStayDetails.objects.filter(owner=tenant.owner).first()
                    if apartment:
                        property_name = apartment.apartmentName
                        property_type = apartment.stayType
                        location = apartment.location
                        if apartment.cover_image:
                            if request:
                                property_image = request.build_absolute_uri(apartment.cover_image.url)
                            else:
                                property_image = apartment.cover_image.url
                    else:
                        commercial = CommericialDetails.objects.filter(owner=tenant.owner).first()
                        if commercial:
                            property_name = commercial.commercialName
                            property_type = commercial.stayType
                            location = commercial.location
                            if commercial.cover_image:
                                if request:
                                    property_image = request.build_absolute_uri(commercial.cover_image.url)
                                else:
                                    property_image = commercial.cover_image.url
 
        # ROOM / FLOOR DETAILS
        room_no = "N/A"
        floor_no = "N/A"
        check_in = "N/A"
        rent = "N/A"
 
        hostel_bed = TenantBeds.objects.filter(phone__iexact=tenant.phone).first()
        if hostel_bed:
            room_no = hostel_bed.roomno
            floor_no = hostel_bed.floor
            check_in = str(hostel_bed.checkIn) if hostel_bed.checkIn else "N/A"
            rent = str(hostel_bed.rent)
        else:
            apt_bed = ApartmentTenantBeds.objects.filter(phone__iexact=tenant.phone).first()
            if apt_bed:
                room_no = apt_bed.flatno
                floor_no = apt_bed.floor
                check_in = str(apt_bed.checkIn) if apt_bed.checkIn else "N/A"
                rent = str(apt_bed.rent)
            else:
                comm_bed = CommercialTenantBeds.objects.filter(phone__iexact=tenant.phone).first()
                if comm_bed:
                    room_no = comm_bed.sectionNo
                    floor_no = comm_bed.floor
                    check_in = str(comm_bed.checkIn) if comm_bed.checkIn else "N/A"
                    rent = str(comm_bed.rent)
        
        if room_no == "N/A" and not tenant.is_vacant:
            jr = JoinRequest.objects.filter(
                tenant=tenant,
                status__in=['completed', 'joined']
            ).order_by('-created_at').first()
            if jr:
                room_no = jr.sharing or jr.flat or jr.section or "N/A"
                floor_no = "1"
                check_in = str(jr.created_at.date()) if jr.created_at else "N/A"

        aadhar_back_url = None
        payment_screenshot_url = None
        selfie_url = None

        if getattr(tenant, 'aadhar_back_image', None):
            if request:
                aadhar_back_url = request.build_absolute_uri(tenant.aadhar_back_image.url)
            else:
                aadhar_back_url = tenant.aadhar_back_image.url
        if getattr(tenant, 'payment_screenshot', None):
            if request:
                payment_screenshot_url = request.build_absolute_uri(tenant.payment_screenshot.url)
            else:
                payment_screenshot_url = tenant.payment_screenshot.url
        if getattr(tenant, 'selfie', None):
            if request:
                selfie_url = request.build_absolute_uri(tenant.selfie.url)
            else:
                selfie_url = tenant.selfie.url
 
        # ── STATUS ENFORCEMENT ──
        # If tenant is vacant, or their latest JoinRequest is still in a pre-join state,
        # they are in 'Pending Join' state. We must strictly hide all property/bed details.
        is_pending = tenant.is_vacant
        
        latest_jr = JoinRequest.objects.filter(tenant=tenant).order_by('-created_at').first()
        if latest_jr and latest_jr.status in ['pending', 'accepted', 'allotted', 'pending_confirmation']:
            is_pending = True

        if is_pending:
            property_name = "N/A"
            property_type = "N/A"
            location = "N/A"
            property_image = None
            room_no = "N/A"
            floor_no = "N/A"
            check_in = "N/A"
            rent = "N/A"
            final_status = "Pending Join"
        else:
            final_status = "Active"

        return {
            "id": tenant.id,
            "name": tenant.name,
            "phone": tenant.phone,
            "gender": getattr(tenant, "gender", "N/A"),
            "identityType": getattr(tenant, "identityType", "N/A"),
            "identityImage": image_url,
            "aadhar_id": getattr(tenant, "aadhar_id", "N/A"),
            "aadhar_image": image_url,
            "aadhar_back_image": aadhar_back_url,
            "payment_screenshot": payment_screenshot_url,
            "selfie": selfie_url,
 
            # PROPERTY
            "property_name": property_name,
            "property_type": property_type,
            "location": location,
            "property_image": property_image,
 
            # ROOM
            "room_number": room_no,
            "floor_number": floor_no,
            "check_in": check_in,
            "rent": rent,
 
            "status": final_status,
        }

    @staticmethod
    def tenant_profile_update(phone, data, files=None):
        tenant = Tenent.objects.filter(phone=phone).first()
        if not tenant:
            raise Exception("Tenant not found")
 
        tenant.name = data.get('name', tenant.name)
        tenant.phone = data.get('phone', tenant.phone)
        
        img_file = data.get('tenant_img_field') or (files and files.get('tenant_img_field'))
        if img_file:
            tenant.selfie = img_file
            
        tenant.save()
        return {"message": "Profile updated successfully"}

    @staticmethod
    def get_tenant_by_phone(phone, request=None):
        tenant = Tenent.objects.filter(phone=phone).first()
        if not tenant:
            raise Exception("Tenant not found")
 
        image_url = None
        if getattr(tenant, 'selfie', None):
            if request:
                image_url = request.build_absolute_uri(tenant.selfie.url)
            else:
                image_url = tenant.selfie.url
 
        return {
            "id": tenant.id,
            "name": tenant.name,
            "phone": tenant.phone,
            "gender": getattr(tenant, "gender", "N/A"),
            "identityType": getattr(tenant, "identityType", "N/A"),
            "identityImage": image_url,
        }

    @staticmethod
    def update_status(data):
        tenant_phone = data.get("tenant_phone")
        owner_phone = data.get("owner_phone")
        status_value = data.get("status")

        tenant = Tenent.objects.filter(
            phone=tenant_phone,
            owner__owner_id=owner_phone
        ).first()
        
        if not tenant:
            # Try alternate key check if matching models exactly
            tenant = Tenent.objects.filter(
                phone=tenant_phone
            ).first()
            
        if not tenant:
            raise Exception("Request not found")
            
        tenant.status = status_value
        tenant.save()
        return {"message": "Status updated"}

    @staticmethod
    def get_owner_tenants(phone):
        owner = CommonService.get_owner(phone)
        if not owner:
            raise Exception("Owner not found")
 
        tenants_list = []
       
        # 1. Hostel Tenants
        hostel_tenants = TenantBeds.objects.filter(Q(owner=owner) | Q(owner_phone=owner.owner_id))
        for t in hostel_tenants:
            tenants_list.append({
                "id": t.id,
                "name": t.name,
                "phone": t.phone,
                "room": f"Room {t.roomno}",
                "property_type": "Hostel",
                "rent": t.rent,
                "checkIn": t.checkIn
            })
           
        # 2. Apartment Tenants
        apartment_tenants = ApartmentTenantBeds.objects.filter(Q(owner=owner) | Q(owner_phone=owner.owner_id))
        for t in apartment_tenants:
            tenants_list.append({
                "id": t.id,
                "name": t.name,
                "phone": t.phone,
                "room": f"Flat {t.flatno}",
                "property_type": "Apartment",
                "rent": t.rent,
                "checkIn": t.checkIn
            })
           
        # 3. Commercial Tenants
        commercial_tenants = CommercialTenantBeds.objects.filter(Q(owner=owner) | Q(owner_phone=owner.owner_id))
        for t in commercial_tenants:
            tenants_list.append({
                "id": t.id,
                "name": t.name,
                "phone": t.phone,
                "room": f"Section {t.sectionNo}",
                "property_type": "Commercial",
                "rent": t.rent,
                "checkIn": t.checkIn
            })
           
        return tenants_list
 
    @staticmethod
    def get_co_residents(phone):
        tenant = CommonService.get_tenant(phone)
        if not tenant or not tenant.owner:
            return []
           
        owner = tenant.owner
        co_residents = []
       
        hostel_beds = TenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in hostel_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Room {t.roomno}",
                "property_type": "Hostel", "rent": t.rent, "checkIn": t.checkIn
            })
           
        apt_beds = ApartmentTenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in apt_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Flat {t.flatno}",
                "property_type": "Apartment", "rent": t.rent, "checkIn": t.checkIn
            })
           
        comm_beds = CommercialTenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in comm_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Section {t.sectionNo}",
                "property_type": "Commercial", "rent": t.rent, "checkIn": t.checkIn
            })
           
        return co_residents

    @staticmethod
    def get_co_residents(phone):
        tenant = CommonService.get_tenant(phone)
        if not tenant or not tenant.owner:
            return []
            
        owner = tenant.owner
        co_residents = []
        
        hostel_beds = TenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in hostel_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Room {t.roomno}",
                "property_type": "Hostel", "rent": t.rent, "checkIn": t.checkIn
            })
            
        apt_beds = ApartmentTenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in apt_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Flat {t.flatno}",
                "property_type": "Apartment", "rent": t.rent, "checkIn": t.checkIn
            })
            
        comm_beds = CommercialTenantBeds.objects.filter(Q(owner_phone=owner.owner_id) | Q(owner_phone=owner.phone)).exclude(phone__iexact=phone)
        for t in comm_beds:
            co_residents.append({
                "id": t.id, "name": t.name, "phone": t.phone, "room": f"Section {t.sectionNo}",
                "property_type": "Commercial", "rent": t.rent, "checkIn": t.checkIn
            })
            
        return co_residents

    @staticmethod
    @transaction.atomic
    def tenant_submit_verification(data, files):
        phone = data.get("phone")
        aadhar_id = data.get("aadhar_id")
        aadhar_image = files.get("aadhar_image")
        aadhar_back_image = files.get("aadhar_back_image")
        payment_screenshot = files.get("payment_screenshot")
        selfie = files.get("selfie")

        if not phone or not aadhar_id or not aadhar_image:
            raise ValueError("Aadhaar ID and Aadhaar Front image are required.")

        aadhar_id = aadhar_id.strip()
        if not aadhar_id.isdigit() or len(aadhar_id) != 12:
            raise ValueError("Aadhar ID must be exactly 12 numeric digits.")

        existing_tenant = Tenent.objects.filter(aadhar_id=aadhar_id).exclude(phone=phone).first()
        if existing_tenant:
            raise ValueError("This Aadhar ID is already registered to another user.")

        tenant = CommonService.get_tenant(phone)
        if not tenant:
            raise Exception("Tenant not found.")

        # ── Save documents on tenant ──
        tenant.aadhar_id = aadhar_id
        tenant.aadhar_image = aadhar_image
        if aadhar_back_image:
            tenant.aadhar_back_image = aadhar_back_image
        if payment_screenshot:
            tenant.payment_screenshot = payment_screenshot
        if selfie:
            tenant.selfie = selfie

        # ── Find the pending_confirmation JoinRequest (or fall back to allotted/accepted) ──
        join_req = JoinRequest.objects.filter(
            tenant=tenant,
            status__in=['pending_confirmation', 'allotted', 'accepted']
        ).order_by('-created_at').first()

        # ── Create TenantBeds from allotment data stored on JoinRequest ──
        if join_req and join_req.allotted_rent is not None:
            property_type = (join_req.property_type or '').lower()
            owner_phone = join_req.allotted_owner_phone or (
                join_req.owner.owner_id if join_req.owner else ''
            )
            check_in = join_req.allotted_check_in
            check_out = join_req.allotted_check_out
            rent = join_req.allotted_rent or 0

            if property_type == 'hostel':
                if not TenantBeds.objects.filter(phone=phone).exists():
                    TenantBeds.objects.create(
                        owner=join_req.owner,
                        owner_phone=owner_phone,
                        name=tenant.name,
                        phone=tenant.phone,
                        bed=join_req.allotted_bed or 1,
                        floor=join_req.allotted_floor,
                        roomno=join_req.allotted_roomno,
                        rent=rent,
                        checkIn=check_in,
                        checkOut=check_out,
                    )
            elif property_type == 'apartment':
                if not ApartmentTenantBeds.objects.filter(phone=phone).exists():
                    ApartmentTenantBeds.objects.create(
                        owner=join_req.owner,
                        owner_phone=owner_phone,
                        name=tenant.name,
                        phone=tenant.phone,
                        floor=join_req.allotted_floor,
                        flatno=join_req.allotted_flatno,
                        rent=rent,
                        checkIn=check_in,
                        checkOut=check_out,
                    )
            elif property_type == 'commercial':
                if not CommercialTenantBeds.objects.filter(phone=phone).exists():
                    CommercialTenantBeds.objects.create(
                        owner=join_req.owner,
                        owner_phone=owner_phone,
                        name=tenant.name,
                        phone=tenant.phone,
                        floor=join_req.allotted_floor,
                        sectionNo=join_req.allotted_sectionno,
                        rent=rent,
                        checkIn=check_in,
                        checkOut=check_out,
                    )

        # ── Activate tenant ──
        tenant.is_vacant = False
        if join_req and join_req.owner:
            tenant.owner = join_req.owner
        tenant.save()

        # ── Transition JoinRequest to 'joined' ──
        if join_req:
            join_req.status = 'joined'
            join_req.save()

        return {"message": "Verification submitted successfully!"}

    @staticmethod
    @transaction.atomic
    def block_tenant(data):
        tenant_phone = data.get('tenant_phone')
        owner_phone = data.get('owner_phone')
        reason = data.get('reason', 'Blocked by owner')

        if not tenant_phone or not owner_phone:
            raise ValueError("tenant_phone and owner_phone are required")

        owner = CommonService.get_owner(owner_phone)
        if not owner:
            raise Exception("Owner not found")

        tenant = CommonService.get_tenant(tenant_phone)
        if not tenant:
            raise Exception("Tenant not found")

        blocked_tenant, created = BlockedTenant.objects.get_or_create(
            owner=owner, tenant=tenant, defaults={'reason': reason, 'is_active': True}
        )
        if not created:
            blocked_tenant.is_active = True
            blocked_tenant.reason = reason
            blocked_tenant.save()

        tenant.is_vacant = True
        tenant.owner = None
        tenant.save()

        TenantBeds.objects.filter(owner_phone=owner_phone, phone=tenant_phone).delete()
        ApartmentTenantBeds.objects.filter(owner_phone=owner_phone, phone=tenant_phone).delete()
        CommercialTenantBeds.objects.filter(owner_phone=owner_phone, phone=tenant_phone).delete()
        JoinRequest.objects.filter(owner=owner, tenant=tenant).delete()

        return {'message': 'Tenant blocked successfully'}

    @staticmethod
    def unblock_tenant(data):
        tenant_phone = data.get('tenant_phone')
        owner_phone = data.get('owner_phone')

        if not tenant_phone or not owner_phone:
            raise ValueError("tenant_phone and owner_phone are required")

        owner = CommonService.get_owner(owner_phone)
        if not owner:
            raise Exception("Owner not found")

        tenant = CommonService.get_tenant(tenant_phone)
        if not tenant:
            raise Exception("Tenant not found")

        blocked_tenant = BlockedTenant.objects.filter(owner=owner, tenant=tenant).first()
        if blocked_tenant:
            blocked_tenant.is_active = False
            blocked_tenant.save()
            return {'message': 'Tenant unblocked successfully'}
        
        raise Exception("Block record not found")
