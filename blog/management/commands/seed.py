from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from blog.models import Category, Article
from django.utils.text import slugify

class Command(BaseCommand):
    help = 'Seeds the database with initial data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # 1. Create Superuser if not exists
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
            self.stdout.write('Created superuser: admin/admin123')
        
        admin = User.objects.get(username='admin')

        # 2. Create Category
        default_cat, created = Category.objects.get_or_create(
            name='默认分类',
            defaults={'slug': 'default'}
        )
        if created:
            self.stdout.write('Created category: 默认分类')

        # 3. Create Sample Articles
        articles_data = [
            {
                'title': '批判任豚大师兄的五个理由',
                'content': '这里是关于批判任豚大师兄的详细内容... (示例正文)',
            },
            {
                'title': '亨利杨我要屌插你',
                'content': '这里是关于亨利杨的详细内容... (示例正文)',
            },
            {
                'title': 'Röi韩我操你妈',
                'content': '这里是关于 Röi 韩的详细内容... (示例正文)',
            }
        ]

        for data in articles_data:
            slug = slugify(data['title'], allow_unicode=True)
            if not Article.objects.filter(title=data['title']).exists():
                Article.objects.create(
                    title=data['title'],
                    slug=slug,
                    content=data['content'],
                    author=admin,
                    category=default_cat,
                    is_published=True
                )
                self.stdout.write(f'Created article: {data["title"]}')

        self.stdout.write(self.style.SUCCESS('Successfully seeded database'))
