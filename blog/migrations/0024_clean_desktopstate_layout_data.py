from django.db import migrations


ALLOWED_MODULE_KEYS = {
    "study",
    "cinema",
    "notes",
    "camera",
    "wallpaper",
    "ai-chat",
    "games",
    "friends",
    "music",
    "profile",
    "settings",
    "extensions",
}


def normalize_key(item):
    value = item.get("module_key", item.get("id"))
    if value is None:
        return ""
    return str(value)


def integer_or_none(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    return None


def clean_layout_item(item, *, allowed_keys=None, convert_pos=False):
    if not isinstance(item, dict):
        return None

    item_key = normalize_key(item)
    if not item_key:
        return None
    if allowed_keys is not None and item_key not in allowed_keys:
        return None

    cleaned = {
        "id": item_key,
        "module_key": item_key,
    }

    x = integer_or_none(item.get("x"))
    y = integer_or_none(item.get("y"))
    legacy_pos = integer_or_none(item.get("pos"))

    if convert_pos and legacy_pos is not None:
        if x is None:
            x = legacy_pos % 3
        if y is None:
            y = legacy_pos // 3

    if x is not None:
        cleaned["x"] = x
    if y is not None:
        cleaned["y"] = y

    width = integer_or_none(item.get("width"))
    height = integer_or_none(item.get("height"))
    order = integer_or_none(item.get("order"))

    if width is not None and width > 0:
        cleaned["width"] = width
    if height is not None and height > 0:
        cleaned["height"] = height
    if order is not None:
        cleaned["order"] = order
    if isinstance(item.get("visible"), bool):
        cleaned["visible"] = item["visible"]

    return cleaned


def clean_layout_list(items, *, allowed_keys=None, convert_pos=False):
    if not isinstance(items, list):
        return []

    cleaned = []
    seen = set()

    for item in items:
        clean_item = clean_layout_item(
            item,
            allowed_keys=allowed_keys,
            convert_pos=convert_pos,
        )
        if not clean_item:
            continue

        item_key = clean_item["module_key"]
        if item_key in seen:
            continue

        seen.add(item_key)
        cleaned.append(clean_item)

    return cleaned


def clean_desktop_state_data(apps, schema_editor):
    DesktopState = apps.get_model("blog", "DesktopState")

    for desktop_state in DesktopState.objects.all().iterator():
        data = desktop_state.data
        if not isinstance(data, dict):
            desktop_state.data = {}
            desktop_state.save(update_fields=["data"])
            continue

        cleaned = dict(data)
        cleaned["desktopModules"] = clean_layout_list(
            data.get("desktopModules"),
            allowed_keys=ALLOWED_MODULE_KEYS,
        )

        folder_layouts = data.get("folderLayouts")
        if isinstance(folder_layouts, dict):
            cleaned["folderLayouts"] = {
                str(folder_type): clean_layout_list(items, convert_pos=True)
                for folder_type, items in folder_layouts.items()
                if clean_layout_list(items, convert_pos=True)
            }
        else:
            cleaned["folderLayouts"] = {}

        desktop_state.data = cleaned
        desktop_state.save(update_fields=["data"])


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0023_desktopstate"),
    ]

    operations = [
        migrations.RunPython(clean_desktop_state_data, migrations.RunPython.noop),
    ]
