from django.db import migrations, models


def update_default_zones(apps, schema_editor):
    apps.get_model("workspace", "UserProfile").objects.filter(timezone="UTC").update(timezone="Asia/Tehran")


class Migration(migrations.Migration):
    dependencies = [("workspace", "0002_telegram")]
    operations = [
        migrations.AlterField(model_name="userprofile", name="timezone", field=models.CharField(max_length=80, default="Asia/Tehran")),
        migrations.RunPython(update_default_zones, migrations.RunPython.noop),
    ]
