from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta
import environ

env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env before any env() lookup below.
environ.Env.read_env(BASE_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# Read from the environment (.env in development, real environment
# variables in production). There is deliberately NO default: a missing
# key must fail loudly at startup rather than silently fall back to a
# value committed to source control.
SECRET_KEY = env("SECRET_KEY")

# Key used to sign this project's own JWTs (see HAC/jwt_utils.py). Kept
# separate from SECRET_KEY so Django's key can be rotated without signing
# every user out, and so a leaked signing key can be replaced on its own.
# Falls back to SECRET_KEY when JWT_SIGNING_KEY is not set.
JWT_SIGNING_KEY = env("JWT_SIGNING_KEY", default=SECRET_KEY)
JWT_ALGORITHM = env("JWT_ALGORITHM", default="HS256")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True




# Application definition

INSTALLED_APPS = [
    'daphne',
    'django_watchfiles',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'HAC',
    'corsheaders',
    'rest_framework',
    'channels',
    'storages',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',

    # Custom middleware
    'HAC.middleware.OwnerAccountMiddleware',
    'HAC.middleware.MaintenanceMiddleware',

    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

#REST_FRAMEWORK = {
#    "DEFAULT_AUTHENTICATION_CLASSES": (
#        "rest_framework_simplejwt.authentication.JWTAuthentication",
#    ),
#    "DEFAULT_PERMISSION_CLASSES": (
#        "rest_framework.permissions.IsAuthenticated",
#    )
#}

ROOT_URLCONF = 'BMS.urls'
CORS_ALLOW_ALL_ORIGINS = True
ALLOWED_HOSTS = ['*']

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'BMS.wsgi.application'
ASGI_APPLICATION = 'BMS.asgi.application'

CHANNEL_LAYERS = {
   'default': {
       'BACKEND': 'channels.layers.InMemoryChannelLayer',
   },
}


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}



# CHANNEL_LAYERS = {
#     "default": {
#         "BACKEND": "channels_redis.core.RedisChannelLayer",
#         "CONFIG": {
#             "hosts": [
#                 (
#                     env("REDIS_HOST"),
#                     int(env("REDIS_PORT"))
#                 )
#             ],
#         },
#     },
# }

# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases


# DATABASES = {
#     "default": {
#         "ENGINE": env(
#             "DB_ENGINE",
#             default="django.db.backends.sqlite3"
#         ),
#         "NAME": env(
#             "DB_NAME",
#             default=str(BASE_DIR / "db.sqlite3")
#         ),
#         "USER": env("DB_USER", default=""),
#         "PASSWORD": env("DB_PASSWORD", default=""),
#         "HOST": env("DB_HOST", default=""),
#         "PORT": env("DB_PORT", default=""),
#     }
# }


# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.getenv("DB_NAME"),
#         "USER": os.getenv("DB_USER"),
#         "PASSWORD": os.getenv("DB_PASSWORD"),
#         "HOST": os.getenv("DB_HOST","localhost"),
#         "PORT": os.getenv("DB_PORT","5432"),
# }
# }



# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': 'Tanvox1',
#         'USER': 'postgres',
#         'PASSWORD': 'root',
#         'HOST': 'localhost',
#         'PORT': '5432',
#     }
# }

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')



#AWS S3 MEDIA STORAGE

#AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
#AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default=None)
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default=None)

AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME")

AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}


MEDIA_URL = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/"


# Django's default pair, deliberately restored.
#
# Only the in-memory handler was configured here, to dodge a Python 3.12 +
# Django < 4.2.8 TemporaryFile bug that does not apply on Django 6.0. The side
# effect was severe and completely silent: MemoryFileUploadHandler deactivates
# itself when the WHOLE multipart body exceeds FILE_UPLOAD_MAX_MEMORY_SIZE
# (2.5 MB by default), and with no temporary-file handler behind it every
# uploaded file was then discarded instead of spilling to disk. Requests still
# returned 200 with request.FILES empty -- which is why property registrations
# saved cover_image="" and gallery_images=[] whenever the photos were large,
# while a small upload went through fine.
FILE_UPLOAD_HANDLERS = [
    "django.core.files.uploadhandler.MemoryFileUploadHandler",
    "django.core.files.uploadhandler.TemporaryFileUploadHandler",
]

# Phone photos are routinely several MB, and registration posts a cover image
# plus a gallery in one request.
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024      # keep <=10 MB in memory
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024      # non-file fields (layout JSON)


EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)

EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")


DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
SERVER_EMAIL = EMAIL_HOST_USER

CACHES = {
   "default": {
       "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
       "LOCATION": "otp-cache",
   }
}

# CACHES = {
#     "default": {
#         "BACKEND": "django_redis.cache.RedisCache",
#         "LOCATION": "redis://127.0.0.1:6379/1",
#         "OPTIONS": {
#             "CLIENT_CLASS": "django_redis.client.DefaultClient",
#         },
#     }
# }


TWO_FACTOR_API_KEY = env("API_KEY")
