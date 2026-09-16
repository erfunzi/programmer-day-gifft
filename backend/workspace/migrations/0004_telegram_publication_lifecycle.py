from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("workspace", "0003_tehran_timezone")]
    operations = [
        migrations.AddField(model_name="telegrampublication", name="deleted", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="telegrampublication", name="membership_checked", field=models.BooleanField(default=False)),
    ]
