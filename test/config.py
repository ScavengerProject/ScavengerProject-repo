import os

# ---------- VÁRIAVEIS GERAIS ----------

# URL´s
URL_LOGIN = "http://localhost:5173/login"
URL_PAINEL_ADMIN = "http://localhost:5173/"
URL_PAINEL_PARTICIPANTE = "http://localhost:5173/"
URL_RESTRITA_ADMIN = "http://localhost:5173/admin/provas" # Apenas o Admin pode acessar

# TEMPO
TIMEOUT_MAXIMO = 10  # segundos
TEMPO_LIMITE_RESPOSTA = 3  # segundos

# DADOS DE LOGIN
# adm
EMAIL_ADMIN = "admin@gincana.com"
SENHA_ADMIN = "admin123"
EMAIL_GABRIELA = "gabriela.membro@gincana.com"

# COMPONENTES
CAMPO_EMAIL = "email" # ID
CAMPO_SENHA = "senha" # ID
BOTAO_LOGIN = "//button[normalize-space()='Entrar']" #XPATH
TOAST = ".flex.items-start.gap-3.px-4.pt-4.pb-3" # CSS 
ACESSAR_EQUIPES_BOTAO = "body > div:nth-child(1) > div:nth-child(1) > aside:nth-child(1) > div:nth-child(1) > nav:nth-child(2) > div:nth-child(2) > div:nth-child(2) > button:nth-child(1)" # CSS
GERENCIAR_PROVAS_BOTAO = "//body/div[@id='root']/div[@class='flex min-h-screen bg-gray-50']/aside[1]/div[1]/nav[1]/button[2]"
CENTRAL_DE_INFO_BOTAO = "//body/div[@id='root']/div[@class='flex min-h-screen bg-gray-50']/aside[1]/div[1]/nav[1]/button[1]" # XPATH
COMPONENTE_PAG_ACESSAR_EQUIPES = "//h3[normalize-space()='Membros da Equipe']" # XPATH


# ---------- CONFIGURAÇÃO DE SCREENSHOTS ----------

DIRETORIO_BASE_SCREENSHOTS = r"C:\Users\User\Documents\grupo-03-1\test\screenshots"

def caminho_screenshot(nome_arquivo):
    """Gera um caminho completo de screenshot com base no nome do arquivo."""
    return os.path.join(DIRETORIO_BASE_SCREENSHOTS, nome_arquivo)
