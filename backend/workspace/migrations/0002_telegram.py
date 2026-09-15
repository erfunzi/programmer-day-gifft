from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("workspace", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="TelegramLink",
            fields=[
                ("token", models.CharField(max_length=96, primary_key=True, serialize=False)),
                ("telegram_id", models.BigIntegerField(blank=True, null=True, unique=True)),
                ("username", models.CharField(blank=True, max_length=255)),
                ("expires", models.BigIntegerField()),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, to="workspace.userprofile")),
            ],
        ),
        migrations.CreateModel(
            name="TelegramPublication",
            fields=[
                ("user", models.OneToOneField(on_delete=models.deletion.CASCADE, primary_key=True, serialize=False, to="workspace.userprofile")),
                ("chat_id", models.CharField(max_length=255)),
                ("message_id", models.BigIntegerField()),
                ("telegram_id", models.BigIntegerField(blank=True, null=True)),
                ("theme", models.CharField(default="aurora-mint", max_length=40)),
                ("created", models.BigIntegerField()),
            ],
        ),
    ]
