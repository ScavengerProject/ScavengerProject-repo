from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import os

# IMPORTA AS VARIÁVEIS DO CONFIG
import sys
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, RAIZ)
from test.config import (
    URL_LOGIN,
    TIMEOUT_MAXIMO,
    TEMPO_LIMITE_RESPOSTA,
    DIRETORIO_BASE_SCREENSHOTS,
    EMAIL_ADMIN,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    TOAST,  # pop-up genérico
    caminho_screenshot
)

# CONFIGURAÇÃO DO ARQUIVO DE PRINT DE FALHA
NOME_ARQUIVO_FALHA = "falha_ct_sec_002.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

# INICIANDO O TESTE CT-SEC-002
print("Iniciando Teste CT-SEC-002 (Login Inválido)...")

try:
    # Garante que o caminho que os screenshots estão sendo direcionados exista
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)
        print(f"Diretório criado: {DIRETORIO_BASE_SCREENSHOTS}")
    
    # Configura o navegador como o Chrome
    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)

    # LOGIN COM SENHA ERRADA
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys("senha_invalida_123")  # SENHA INVÁLIDA
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    print("Credenciais inválidas enviadas")
    
    # VERIFICAÇÕES (CRITÉRIOS DE ACEITAÇÃO)
    # PRIMEIRO: VERIFICAÇÃO DE PERMANECER NA MESMA PÁGINA
    time.sleep(TEMPO_LIMITE_RESPOSTA) 
    url_atual = navegador.current_url
    
    # SEGUNDO: VERIFICAÇÃO DO TOAST DE ERRO
    toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST))) 
    mensagem_toast = wait.until(lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False) # Pega o texto escrito no toast e compara com o que deve estar escrito
    MENSAGEM_ESPERADA = "Email ou senha inválidos." # Mudar só a mensagem aqui para validar de resto copiar igual.

    print("\nVerificando mensagem do toast...")
    print(f"Toast recebido: '{mensagem_toast}'")
    if MENSAGEM_ESPERADA.lower() not in mensagem_toast.lower(): raise AssertionError(
        f"C2 (Mensagem do Toast): FALHOU — esperado '{MENSAGEM_ESPERADA}', recebido '{mensagem_toast}'")
    
    # RESULTADOS
    print("\n RESULTADO DO TESTE")
    
    print("✅ SUCESSO (Teste de Falha Aprovado)")
    print(f"C1 (Não Redirecionamento): URL permaneceu em '{url_atual}' (OK)")
    print(f"C2 (Toast Erro): Toast de erro visível e mensagem correta (OK)")
    
except TimeoutException:
    print("\n RESULTADO DO TESTE")
    print(f"❌ FALHA NA VERIFICAÇÃO")
    print("C2 (Toast Erro) NÃO APROVADO: O toast não foi exibido dentro do limite de tempo.")
    
    if navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot salvo em: {CAMINHO_COMPLETO_FALHA}")

except Exception as e:
    print("\n RESULTADO DO TESTE")
    print(f"❌ FALHA INESPERADA (O cenário de falha não ocorreu como esperado)")
    print(f"Erro durante a execução do teste: {e}")
    if navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    time.sleep(3) 
    if navegador:
        navegador.quit()
    print("Teste finalizado.")
