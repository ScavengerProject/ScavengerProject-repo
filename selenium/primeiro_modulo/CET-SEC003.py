from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import os

# CONFIGURANDO AS VARIÁVEIS
URL_LOGIN = "http://localhost:5173/login"
URL_PAINEL_PARTICIPANTE = "http://localhost:5173/"
URL_RESTRITA_ADMIN = "http://localhost:5173/admin/provas" # Apenas o Admin pode acessar
TIMEOUT_MAXIMO = 5  

# CONFIGURAÇÃO DO CAMINHO DOS SCREENSHOTS
DIRETORIO_BASE_SCREENSHOTS = r"C:\Users\User\Documents\grupo-03-1\selenium\primeiro_modulo\screenshots"
NOME_ARQUIVO_FALHA = "falha_ct_sec_003.png"
CAMINHO_COMPLETO_FALHA = os.path.join(DIRETORIO_BASE_SCREENSHOTS, NOME_ARQUIVO_FALHA)

# INICIANDO O TESTE CT-SEC-002
print("Iniciando Teste CT-SEC-003 (Acesso Negado - Participante)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)
        print(f"Diretório criado: {DIRETORIO_BASE_SCREENSHOTS}")
        
    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    
    # PRIMEIRO: LOGIN COMO PARTICIPANTE (Pré-condição)
    campo_email = wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys("gabriela.membro@gincana.com")

    campo_senha = navegador.find_element(By.ID, "senha").send_keys("admin123")

    botao_entrar = navegador.find_element(By.XPATH, "//button[normalize-space()='Entrar']").click()
    
    # Espera o login ser concluído (redirecionamento para o painel de Participante)
    wait.until(EC.url_contains(URL_PAINEL_PARTICIPANTE))
    print(f"Login de Participante realizado com sucesso. URL atual: {navegador.current_url}")
    
    # SEGUNDO: TENTATIVA DE ACESSO DIRETO À URL RESTRITA
    print(f"Tentando acessar URL restrita: {URL_RESTRITA_ADMIN}")
    navegador.get(URL_RESTRITA_ADMIN)
    
    # TERCEIRO: VERIFICAÇÃO DE BLOQUEIO E MENSAGEM (Critérios de Aceitação)
    # Critério 1: O sistema deve exibir a mensagem de "Acesso Negado" (TIMEOUT_MAXIMO)
    try:
        mensagem_erro_visivel = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".flex.items-start.gap-3.px-4.pt-4.pb-3"))) 
        
        # Critério 2: A URL DEVE ser diferente da URL Restrita
        url_apos_tentativa = navegador.current_url
        if URL_RESTRITA_ADMIN not in url_apos_tentativa:
            status_url = "OK"
        else:
             status_url = "❌ FALHA (Permaneceu na URL Restrita)"
             raise Exception("Teste falhou: Usuário foi mantido na URL restrita de Administrador.")

        # --- RESULTADOS ---
        print("\n RESULTADO DO TESTE")
        print("✅ SUCESSO (Bloqueio Aprovado)")
        print(f"Critério 1 (Bloqueio): Mensagem de acesso negado visível (OK)")
        print(f"Critério 2 (URL): Redirecionamento/Bloqueio da URL (OK)")

    except TimeoutException:
        # Falha: Não apareceu a mensagem de erro, não vai aparecer por que já detectei que ela não existe.
        raise Exception(f"Teste falhou: Mensagem de 'Acesso Negado' não foi exibida. URL atual: {navegador.current_url}")

except Exception as e:
    print("\n RESULTADO DO TESTE")
    print(f"❌ FALHOU")
    print(f"Erro durante a execução do teste: {e}")

    if navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    time.sleep(3) 
    if navegador:
        navegador.quit()
    print("Teste finalizado.")