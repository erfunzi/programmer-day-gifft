from django.db import migrations, models
class Migration(migrations.Migration):
    dependencies = [("workspace", "0004_telegram_publication_lifecycle")]
    operations = [
        migrations.AddField(model_name="userprofile", name="theme", field=models.CharField(max_length=40, default="aurora-mint")),
        migrations.AddField(model_name="userprofile", name="language", field=models.CharField(max_length=2, default="fa")),
    ]
