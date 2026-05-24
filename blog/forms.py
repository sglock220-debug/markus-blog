from django import forms
from django.contrib.auth.models import User
from .models import Article

class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ['title', 'slug', 'content', 'category', 'is_published']

class RegisterForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput(), label="密码")
    confirm_password = forms.CharField(widget=forms.PasswordInput(), label="确认密码")

    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        labels = {
            'username': '用户名',
            'email': '邮箱',
        }

    def clean_confirm_password(self):
        password = self.cleaned_data.get('password')
        confirm_password = self.cleaned_data.get('confirm_password')
        if password and confirm_password and password != confirm_password:
            raise forms.ValidationError("两次输入的密码不一致")
        return confirm_password

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user
