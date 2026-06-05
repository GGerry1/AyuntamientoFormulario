"""Accounts Serializers"""
import io
import qrcode
import base64
from rest_framework import serializers
from .models import Administrator


class RegisterSerializer(serializers.Serializer):
    """Override dj-rest-auth — OAuth only, no password registration."""
    pass


class AdministratorSerializer(serializers.ModelSerializer):
    qr_url = serializers.ReadOnlyField()
    qr_image_base64 = serializers.SerializerMethodField()
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = Administrator
        fields = [
            'id', 'email', 'nombre', 'display_name',
            'proveedor_oauth', 'qr_token', 'qr_url',
            'qr_image_base64', 'fecha_creacion', 'activo'
        ]
        read_only_fields = ['id', 'email', 'qr_token', 'proveedor_oauth', 'fecha_creacion']

    def get_qr_image_base64(self, obj):
        """Generate QR code as base64 PNG for frontend display/download."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(obj.qr_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1a1a2e", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        encoded = base64.b64encode(buffer.read()).decode('utf-8')
        return f"data:image/png;base64,{encoded}"


class AdministratorUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Administrator
        fields = ['nombre']
