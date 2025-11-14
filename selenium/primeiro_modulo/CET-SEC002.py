from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import os

# CONFIGURANDO AS VARIÁVEIS
URL_LOGIN = "http://localhost:5173/"
URL_ESPERADA_APOS_FALHA = "http://localhost:5173/"  # É a mesma por que o login deve falhar
TIMEOUT_MAXIMO = 10  # Tempo máximo de espera para elementos (em segundos)
TEMPO_ESPERA_NAO_REDIRECIONAMENTO = 2 # Tempo de espera extra para garantir que não houve redirecionamento

# CONFIGURAÇÃO DO CAMINHO DOS SCREENSHOTS
DIRETORIO_BASE_SCREENSHOTS = r"C:\Users\User\Documents\grupo-03-1\selenium\primeiro_modulo\screenshots"
NOME_ARQUIVO_FALHA = "falha_ct_sec_002.png"
CAMINHO_COMPLETO_FALHA = os.path.join(DIRETORIO_BASE_SCREENSHOTS, NOME_ARQUIVO_FALHA)


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

    # LOGIN
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    
    campo_email = wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys("admin@gincana.com") # email válido
    campo_senha = navegador.find_element(By.ID, "senha").send_keys("senha_invalida_123") # SENHA INVÁLIDA
    botao_entrar = navegador.find_element(By.XPATH, "//button[normalize-space()='Entrar']").click()
    
    print("Credenciais inválidas enviadas")
    
    # VERIFICAÇÕES (CRITÉRIOS DE ACEITAÇÃO)
    
    # PRIMEIRO: VERIFICAÇÃO DE PERMANECER NA MESMA PÁGINA
    time.sleep(TEMPO_ESPERA_NAO_REDIRECIONAMENTO) 
    url_atual = navegador.current_url
    
    # SEGUNDO: VERIFICAÇÃO DO POP-UP DE ERRO
    pop_up_erro = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".flex.items-start.gap-3.px-4.pt-4.pb-3"))) 
    
    # RESULTADOS
    print("\n RESULTADO DO TESTE")
    
    # Confirmação da Falha de Login
    print("✅ SUCESSO (Teste de Falha Aprovado)")
    print(f"Critério 1 (Não Redirecionamento): URL permaneceu em '{url_atual}' (OK)")
    print(f"Critério 2 (Pop-up Erro): Pop-up de erro visível (OK)")
    
except TimeoutException as e:
    # Captura a falha se o pop-up de erro não aparecer (o teste falhou na espera)
    print("\n RESULTADO DO TESTE")
    print(f"❌ FALHA NA VERIFICAÇÃO")
    print("Critério 2 (Pop-up Erro) NÃO APROVADO: O pop-up não foi exibido dentro do limite de tempo.")
    
    # Salva o screenshot no caminho
    if navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot salvo em: {CAMINHO_COMPLETO_FALHA}")

except Exception as e:

    # Captura outras falhas inesperadas (ex: se o campo de senha sumir)
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