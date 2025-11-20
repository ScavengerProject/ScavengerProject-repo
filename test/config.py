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
EMAIL_ADMIN = "admin@gincana.com"
SENHA_ADMIN = "admin123"
EMAIL_GABRIELA = "gabriela.membro@gincana.com"
EMAIL_PEDRO = "aluno.membro@gincana.com"
EMAIL_ALUNOMEDIO3 = "aluno3@medio.com"
EMAIL_LEONARDO = "leonardo.membro@gincana.com"

# COMPONENTES
CAMPO_EMAIL = "email" # ID
CAMPO_SENHA = "senha" # ID
BOTAO_LOGIN = "//button[normalize-space()='Entrar']" #XPATH
TOAST = ".flex.items-start.gap-3.px-4.pt-4.pb-3" # CSS 
ACESSAR_EQUIPES_BOTAO = "body > div:nth-child(1) > div:nth-child(1) > aside:nth-child(1) > div:nth-child(1) > nav:nth-child(2) > div:nth-child(2) > div:nth-child(2) > button:nth-child(1)" # CSS
GERENCIAR_PROVAS_BOTAO = "//body/div[@id='root']/div[@class='flex min-h-screen bg-gray-50']/aside[1]/div[1]/nav[1]/button[2]" # XPATH
GERENCIAR_PENALIDADES_BOTAO = "//div[1]//nav[1]//button[5]" # XPATH
CENTRAL_DE_INFO_BOTAO = "//body/div[@id='root']/div[@class='flex min-h-screen bg-gray-50']/aside[1]/div[1]/nav[1]/button[1]" # XPATH
COMPONENTE_PAG_ACESSAR_EQUIPES = "//h3[normalize-space()='Membros da Equipe']" # XPATH
COMPONENTE_NO_GER_PROVAS = "//h2[normalize-space()='Provas da Gincana']" # XPATH


# ---------- CONFIGURAÇÃO DE SCREENSHOTS ----------

# Obtém o diretório onde este arquivo (config.py) está localizado
DIRETORIO_BASE_TEST = os.path.dirname(os.path.abspath(__file__))
DIRETORIO_BASE_SCREENSHOTS = os.path.join(DIRETORIO_BASE_TEST, "screenshots")

def caminho_screenshot(nome_arquivo):
    """Gera um caminho completo de screenshot com base no nome do arquivo."""
    return os.path.join(DIRETORIO_BASE_SCREENSHOTS, nome_arquivo)